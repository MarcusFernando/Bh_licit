from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import Optional
from database import init_db, get_session
from models import Licitacao, LicitacaoItem, AgentMessage, ImpugnacaoEsclarecimento, EditalVersion
from core.config import settings
from pydantic import BaseModel

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    await init_db()

@app.get("/")
async def root():
    return {"message": "Brasilhosp Licitation Agent API is running"}

@app.post("/api/sync")
async def sync_pncp(days: int = 3, session: AsyncSession = Depends(get_session)):
    from services.pncp_client import PNCPClient
    client = PNCPClient()
    try:
        count = await client.fetch_and_process(session, days=days)
        return {"status": "success", "new_items": count}
    finally:
        await client.close()

from sqlmodel import select, func, col

# ... (imports)

@app.get("/api/licitacoes")
async def list_licitacoes(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    days: Optional[int] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    session: AsyncSession = Depends(get_session)
):
    offset = (page - 1) * limit
    
    # Base query
    query = select(Licitacao)
    count_query = select(func.count()).select_from(Licitacao)
    
    # Date Filter
    if days:
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=days)
        query = query.where(Licitacao.data_publicacao >= cutoff_date)
        count_query = count_query.where(Licitacao.data_publicacao >= cutoff_date)
    
    # Filter Logic
    if status == 'rejeitado':
        # View: Rejeitados (Trash)
        query = query.where(Licitacao.status == 'rejeitado')
        count_query = count_query.where(Licitacao.status == 'rejeitado')
    elif status == 'aprovado':
        # View: Aprovados (Safe)
        query = query.where(Licitacao.status == 'aprovado')
        count_query = count_query.where(Licitacao.status == 'aprovado')
    elif priority == 'alta':
         # View: Alta Prioridade (Smart View)
         # Show High Priority AND Not Rejected
         query = query.where(Licitacao.priority == 'alta', Licitacao.status != 'rejeitado')
         count_query = count_query.where(Licitacao.priority == 'alta', Licitacao.status != 'rejeitado')
    else:
        # View: Todos (Default Radar)
        # Show Everything EXCEPT Rejected
        query = query.where(Licitacao.status != 'rejeitado')
        count_query = count_query.where(Licitacao.status != 'rejeitado')
    
    # Additional specific filters if needed (legacy support)
    if status and status not in ['rejeitado', 'aprovado']:
         query = query.where(Licitacao.status == status)
         count_query = count_query.where(Licitacao.status == status)
    
    # Execution Logic (Fuzzy vs Standard)
    if search:
        # Fuzzy Search Strategy (Python-side)
        from thefuzz import fuzz
        
        # 1. Fetch ALL candidates matching filters (ignoring limit/offset for now)
        # using the 'query' built so far (which has dates/status filters)
        result = await session.exec(query)
        all_candidates = result.all()
        
        scored_items = []
        search_lower = search.lower()
        
        for item in all_candidates:
            # Combine fields for search context
            # Use 'or' to avoid NoneType errors
            t_title = item.titulo or ""
            t_org = item.orgao_nome or ""
            t_city = item.cidade or ""
            target_str = f"{t_title} {t_org} {t_city}".lower()
            
            # 1. Direct check (fastest & most accurate)
            if search_lower in target_str:
                scored_items.append((item, 100))
                continue
                
            # 2. Smart Fuzzy (Token Set Ratio)
            # Handles:
            # - Typos: "siringa" -> "seringa" (High Score)
            # - Order: "Luva Cirurgica" -> "Cirurgica Luva" (High Score)
            # - Partial: "Luva" -> "Luva de Procedimento" (High Score)
            # BUT avoids: "bico" -> "rabico" (Low Score in Token Sort)
            score = fuzz.token_set_ratio(search_lower, target_str)

            # Threshold drastically increased to 80 to reduce noise
            if score >= 80: 
                scored_items.append((item, score))
        
        # Sort by Relevance (Score) DESC, then Date DESC
        scored_items.sort(key=lambda x: (x[1], x[0].data_publicacao), reverse=True)
        
        # Pagination in Memory
        total = len(scored_items)
        # Unpack items from tuples
        items = [x[0] for x in scored_items[offset : offset + limit]]
        
    else:
        # Standard SQL Pagination (Fast)
        total_result = await session.exec(count_query)
        total = total_result.one()
        
        # Get items (Sort by Score DESC (Smart Priority), then Date DESC)
        query = query.order_by(Licitacao.score.desc(), Licitacao.data_publicacao.desc()).offset(offset).limit(limit)
        result = await session.exec(query)
        items = result.all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if limit > 0 else 1
    }

@app.patch("/api/licitacoes/{licitacao_id}/status")
async def update_status(
    licitacao_id: int, 
    status: str,
    rejection_reason: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    licitacao = await session.get(Licitacao, licitacao_id)
    if not licitacao:
        return {"error": "Licitacao not found"}
        
    licitacao.status = status
    if rejection_reason:
        licitacao.rejection_reason = rejection_reason
        
    session.add(licitacao)
    await session.commit()
    await session.refresh(licitacao)
    return licitacao

@app.post("/api/licitacoes/{licitacao_id}/analyze")
async def analyze_licitacao_endpoint(
    licitacao_id: int, 
    session: AsyncSession = Depends(get_session)
):
    licitacao = await session.get(Licitacao, licitacao_id)
    if not licitacao:
        return {"error": "Licitacao not found"}
        
    from services.llm_engine import LLMEngine
    engine = LLMEngine()
    
    try:
        # Construct relevant string for AI
        details = f"Modalidade: {licitacao.categoria}. Estado: {licitacao.estado_sigla}. {licitacao.cidade}."
        analysis = await engine.analyze_licitacao(
            title=licitacao.titulo,
            organ=licitacao.orgao_nome,
            details=details,
            status=licitacao.status,
            rejection_reason=licitacao.rejection_reason
        )
        return analysis
    finally:
        await engine.close()

class ItemCreate(BaseModel):
    numero_item: int
    descricao: str
    quantidade: float
    valor_unitario: float
    unidade: str

@app.post("/api/licitacoes/{id}/items", response_model=LicitacaoItem)
async def create_item(id: int, item: ItemCreate, session: AsyncSession = Depends(get_session)):
    new_item = LicitacaoItem(
        licitacao_id=id,
        numero_item=item.numero_item,
        descricao=item.descricao,
        quantidade=item.quantidade,
        valor_unitario=item.valor_unitario,
        unidade=item.unidade,
        codigo_item=""
    )
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@app.get("/api/licitacoes/{licitacao_id}/items")
async def get_licitacao_items(
    licitacao_id: int, 
    session: AsyncSession = Depends(get_session)
):
    from services.pncp_client import PNCPClient
    client = PNCPClient()
    try:
        items = await client.fetch_items(session, licitacao_id)
        return items
    finally:
        await client.close()

from typing import Dict
from fastapi.responses import StreamingResponse
from fastapi import File, UploadFile

class ProposalRequest(BaseModel):
    prices: Dict[int, float]

@app.delete("/api/licitacoes/{licitacao_id}/items/{item_id}")
async def delete_item(
    licitacao_id: int,
    item_id: int,
    session: AsyncSession = Depends(get_session)
):
    item = await session.get(LicitacaoItem, item_id)
    if not item:
        return {"error": "Item not found"}
        
    if item.licitacao_id != licitacao_id:
        return {"error": "Item mismatch"}
        
    await session.delete(item)
    await session.commit()
    return {"status": "deleted"}

@app.delete("/api/licitacoes/{licitacao_id}/items")
async def delete_all_items(
    licitacao_id: int, 
    session: AsyncSession = Depends(get_session)
):
    items = await session.exec(select(LicitacaoItem).where(LicitacaoItem.licitacao_id == licitacao_id))
    for item in items:
        await session.delete(item)
    await session.commit()
    return {"status": "all_deleted"}

@app.post("/api/licitacoes/{licitacao_id}/items/extract")
async def extract_items_from_pdf(
    licitacao_id: int, 
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    from services.pdf_extractor import PDFExtractor
    service = PDFExtractor()
    
    try:
        content = await file.read()
        items_data = await service.extract_items(content)
        
        saved_items = []
        for i_data in items_data:
            # Normalize keys just in case LLM varies
            nr = i_data.get("numero_item", i_data.get("item", 0))
            desc = i_data.get("descricao", i_data.get("description", ""))
            qtd = i_data.get("quantidade", i_data.get("qty", 0))
            unit = i_data.get("unidade", i_data.get("unit", "UN"))
            val = i_data.get("valor_unitario", i_data.get("unit_price", 0))

            new_item = LicitacaoItem(
                licitacao_id=licitacao_id,
                numero_item=int(nr) if nr else len(saved_items)+1,
                descricao=desc,
                quantidade=float(qtd) if qtd else 0,
                valor_unitario=float(val) if val else 0,
                unidade=unit,
                codigo_item=""
            )
            session.add(new_item)
            saved_items.append(new_item)
            
        if saved_items:
            await session.commit()
            for item in saved_items:
                await session.refresh(item)
                
        return saved_items
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        await service.close()

@app.post("/api/licitacoes/{licitacao_id}/proposal")
async def generate_proposal(
    licitacao_id: int, 
    request: ProposalRequest,
    session: AsyncSession = Depends(get_session)
):
    licitacao = await session.get(Licitacao, licitacao_id)
    if not licitacao:
        return {"error": "Licitacao not found"}
        
    # Get items
    from services.pncp_client import PNCPClient
    client = PNCPClient()
    try:
        items = await client.fetch_items(session, licitacao_id)
    finally:
        await client.close()
        
    from services.proposal_generator import ProposalGenerator
    generator = ProposalGenerator()
    buffer = generator.create_proposal(licitacao, items, request.prices)
    
    filename = f"Proposta_Licitacao_{licitacao.numero}.docx"
    
    return StreamingResponse(
        buffer, 
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

class MessageCreate(BaseModel):
    sender: str
    content: str
    media_url: Optional[str] = None
    requires_approval: Optional[bool] = False

@app.get("/api/messages")
async def get_messages(session: AsyncSession = Depends(get_session)):
    from datetime import datetime
    statement = select(AgentMessage).order_by(AgentMessage.id.desc()).limit(50)
    results = await session.exec(statement)
    messages = results.all()
    messages.reverse()
    return messages

@app.post("/api/messages")
async def create_message(msg: MessageCreate, session: AsyncSession = Depends(get_session)):
    from datetime import datetime
    new_msg = AgentMessage(
        sender=msg.sender,
        content=msg.content,
        media_url=msg.media_url,
        requires_approval=msg.requires_approval,
        created_at=datetime.utcnow().isoformat()
    )
    session.add(new_msg)
    await session.commit()
    await session.refresh(new_msg)
    return new_msg

@app.post("/api/messages/{msg_id}/approve")
async def approve_message(msg_id: int, action: dict, session: AsyncSession = Depends(get_session)):
    msg = await session.get(AgentMessage, msg_id)
    if not msg:
        return {"error": "Message not found"}
    msg.approval_status = action.get("status", "approved")
    await session.commit()
    return msg


# ─────────────────────────────────────────────────
# PIPELINE / KANBAN
# ─────────────────────────────────────────────────
@app.get("/api/pipeline/items")
async def get_pipeline_items(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Licitacao).where(Licitacao.status != "rejeitado"))
    all_items = result.all()

    kanban: dict = {"recebido": [], "analise": [], "aprovado": [], "em_proposta": []}

    for item in all_items:
        status = item.status or "recebido"
        card = {
            "id": item.id,
            "titulo": item.titulo,
            "orgao_nome": item.orgao_nome,
            "estado_sigla": item.estado_sigla,
            "data_publicacao": str(item.data_publicacao),
            "priority": item.priority,
            "score": item.score,
            "link_edital": item.link_edital,
            "status": item.status,
        }
        kanban[status if status in kanban else "recebido"].append(card)

    return kanban


# ─────────────────────────────────────────────────
# DASHBOARD ESTRATÉGICO
# ─────────────────────────────────────────────────
@app.get("/api/dashboard/charts")
async def get_dashboard_charts(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Licitacao))
    all_items = result.all()

    stages_map = {
        "recebido":    {"label": "Captadas",    "count": 0, "value": 0.0},
        "analise":     {"label": "Em Análise",  "count": 0, "value": 0.0},
        "aprovado":    {"label": "Aprovadas",   "count": 0, "value": 0.0},
        "em_proposta": {"label": "Em Proposta", "count": 0, "value": 0.0},
        "rejeitado":   {"label": "Rejeitadas",  "count": 0, "value": 0.0},
    }
    orgaos_map: dict = {}

    for item in all_items:
        status = item.status or "recebido"
        if status in stages_map:
            stages_map[status]["count"] += 1
            est = float(item.score or 0) * 10_000
            stages_map[status]["value"] += est
            orgao = item.orgao_nome or "Desconhecido"
            orgaos_map[orgao] = orgaos_map.get(orgao, 0.0) + est

    funnel = [
        {"stage": s, "label": stages_map[s]["label"],
         "count": stages_map[s]["count"], "value": stages_map[s]["value"]}
        for s in ["recebido", "analise", "aprovado", "em_proposta"]
    ]

    top_orgaos = sorted(
        [{"name": k, "value": v} for k, v in orgaos_map.items()],
        key=lambda x: x["value"], reverse=True
    )[:5]

# ─── New v4 Endpoints ────────────────────────────────────────────────────────

class ImpugnacaoCreate(BaseModel):
    tipo: str  # "impugnacao" | "esclarecimento"
    texto: str

@app.get("/api/licitacoes/{id}/editais")
async def get_licitacao_editais(id: int, session: AsyncSession = Depends(get_session)):
    """
    Retorna histórico de editais. Se não houver no banco, tenta buscar no PNCP em tempo real.
    """
    licitacao = await session.get(Licitacao, id)
    if not licitacao:
        return []
    
    # Check local first
    db_versions = await session.exec(
        select(EditalVersion).where(EditalVersion.licitacao_id == id).order_by(EditalVersion.versao.desc())
    )
    versions = db_versions.all()
    
    if not versions:
        # Fallback to live fetch from PNCP
        from services.pncp_client import PNCPClient
        client = PNCPClient()
        try:
            versions_data = await client.fetch_edital_versions(licitacao.pncp_id)
            # Sync to DB
            for v in versions_data:
                ev = EditalVersion(
                    licitacao_id=id,
                    versao=v['versao'],
                    titulo_arquivo=v['titulo_arquivo'],
                    url=v['url'],
                    data_publicacao=datetime.fromisoformat(v['data_publicacao'].replace('Z', '+00:00')),
                    is_latest=v['is_latest']
                )
                session.add(ev)
            await session.commit()
            return versions_data
        finally:
            await client.close()
            
    return versions

@app.post("/api/licitacoes/{id}/impugnacoes")
async def create_impugnacao(id: int, data: ImpugnacaoCreate, session: AsyncSession = Depends(get_session)):
    imp = ImpugnacaoEsclarecimento(
        licitacao_id=id,
        tipo=data.tipo,
        texto=data.texto,
        status="rascunho"
    )
    session.add(imp)
    await session.commit()
    await session.refresh(imp)
    return imp

@app.get("/api/licitacoes/{id}/impugnacoes")
async def list_impugnacoes(id: int, session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(ImpugnacaoEsclarecimento).where(ImpugnacaoEsclarecimento.licitacao_id == id)
    )
    return result.all()

@app.patch("/api/licitacoes/{id}/clear-update-flag")
async def clear_update_flag(id: int, session: AsyncSession = Depends(get_session)):
    licitacao = await session.get(Licitacao, id)
    if licitacao:
        licitacao.edital_atualizado = False
        session.add(licitacao)
        await session.commit()
    return {"status": "success"}
