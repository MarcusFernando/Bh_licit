"""
Router: Licitações — CRUD, listagem, busca, exportação CSV.
"""
import csv
from io import StringIO
from typing import Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func, col

from infra.database import get_session
from domain.models import Licitacao, LicitacaoItem, EditalVersion, ImpugnacaoEsclarecimento
from domain.schemas import StatusUpdate, ItemCreate, ImpugnacaoCreate, ProposalRequest
from domain.exceptions import LicitacaoNotFound, ItemNotFound, ItemMismatch

router = APIRouter(prefix="/api", tags=["Licitações"])


# ─── Listagem ─────────────────────────────────────────────────────────────────

@router.get("/licitacoes")
async def list_licitacoes(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    days: Optional[int] = Query(None, ge=1, le=365),
    search: Optional[str] = Query(None, min_length=2, max_length=200),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session)
):
    offset = (page - 1) * limit

    # Base query
    query = select(Licitacao)
    count_query = select(func.count()).select_from(Licitacao)

    # Date Filter
    if days:
        cutoff_date = datetime.now() - timedelta(days=days)
        query = query.where(Licitacao.data_publicacao >= cutoff_date)
        count_query = count_query.where(Licitacao.data_publicacao >= cutoff_date)

    # Filter Logic
    if status == 'rejeitado':
        query = query.where(Licitacao.status == 'rejeitado')
        count_query = count_query.where(Licitacao.status == 'rejeitado')
    elif status == 'aprovado':
        query = query.where(Licitacao.status == 'aprovado')
        count_query = count_query.where(Licitacao.status == 'aprovado')
    elif priority == 'alta':
        query = query.where(Licitacao.priority == 'alta', Licitacao.status != 'rejeitado')
        count_query = count_query.where(Licitacao.priority == 'alta', Licitacao.status != 'rejeitado')
    else:
        query = query.where(Licitacao.status != 'rejeitado')
        count_query = count_query.where(Licitacao.status != 'rejeitado')

    # Additional specific filters (legacy support)
    if status and status not in ['rejeitado', 'aprovado']:
        query = query.where(Licitacao.status == status)
        count_query = count_query.where(Licitacao.status == status)

    # Execution Logic (Fuzzy vs Standard)
    if search:
        from thefuzz import fuzz

        result = await session.exec(query)
        all_candidates = result.all()

        scored_items = []
        search_lower = search.lower()

        for item in all_candidates:
            t_title = item.titulo or ""
            t_org = item.orgao_nome or ""
            t_city = item.cidade or ""
            target_str = f"{t_title} {t_org} {t_city}".lower()

            if search_lower in target_str:
                scored_items.append((item, 100))
                continue

            score = fuzz.token_set_ratio(search_lower, target_str)
            if score >= 80:
                scored_items.append((item, score))

        scored_items.sort(key=lambda x: (x[1], x[0].data_publicacao), reverse=True)
        total = len(scored_items)
        items = [x[0] for x in scored_items[offset : offset + limit]]
    else:
        total_result = await session.exec(count_query)
        total = total_result.one()
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


# ─── Exportação CSV ───────────────────────────────────────────────────────────

@router.get("/licitacoes/export/csv")
async def export_licitacoes_csv(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    days: Optional[int] = None,
    search: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    query = select(Licitacao)
    if days:
        cutoff_date = datetime.now() - timedelta(days=days)
        query = query.where(Licitacao.data_publicacao >= cutoff_date)

    if status == 'rejeitado':
        query = query.where(Licitacao.status == 'rejeitado')
    elif status == 'aprovado':
        query = query.where(Licitacao.status == 'aprovado')
    elif priority == 'alta':
        query = query.where(Licitacao.priority == 'alta', Licitacao.status != 'rejeitado')
    else:
        query = query.where(Licitacao.status != 'rejeitado')

    result = await session.exec(query)
    all_items = list(result.all())

    if search:
        from thefuzz import fuzz
        search_items = []
        search_lower = search.lower()
        for item in all_items:
            target_str = f"{item.titulo or ''} {item.orgao_nome or ''} {item.cidade or ''}".lower()
            if search_lower in target_str or fuzz.token_set_ratio(search_lower, target_str) >= 80:
                search_items.append(item)
        all_items = search_items

    output = StringIO()
    output.write('\ufeff')
    writer = csv.writer(output, delimiter=';')

    writer.writerow([
        "ID", "Titulo", "Orgao", "CNPJ", "UF", "Cidade", "Publicacao",
        "Abertura", "Modalidade", "SRP", "ME/EPP", "Status", "Prioridade", "Score", "Link"
    ])

    for item in all_items:
        writer.writerow([
            item.pncp_id, item.titulo, item.orgao_nome, item.orgao_cnpj,
            item.estado_sigla, item.cidade,
            item.data_publicacao.strftime("%d/%m/%Y") if item.data_publicacao else "",
            item.data_abertura_proposta.strftime("%d/%m/%Y") if item.data_abertura_proposta else "",
            item.modalidade, "Sim" if item.srp else "Não",
            item.me_epp_status, item.status, item.priority, item.score, item.link_edital
        ])

    output.seek(0)
    filename = f"licitacoes_export_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ─── Status Update ────────────────────────────────────────────────────────────

@router.patch("/licitacoes/{licitacao_id}/status")
async def update_status(
    licitacao_id: int,
    data: StatusUpdate,
    session: AsyncSession = Depends(get_session)
):
    licitacao = await session.get(Licitacao, licitacao_id)
    if not licitacao:
        raise LicitacaoNotFound(licitacao_id)

    licitacao.status = data.status.value
    if data.rejection_reason:
        licitacao.rejection_reason = data.rejection_reason

    session.add(licitacao)
    await session.commit()
    await session.refresh(licitacao)
    return licitacao


# ─── Items CRUD ───────────────────────────────────────────────────────────────

@router.post("/licitacoes/{id}/items", response_model=LicitacaoItem)
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


@router.get("/licitacoes/{licitacao_id}/items")
async def get_licitacao_items(licitacao_id: int, session: AsyncSession = Depends(get_session)):
    from services.pncp_client import PNCPClient
    client = PNCPClient()
    try:
        items = await client.fetch_items(session, licitacao_id)
        return items
    finally:
        await client.close()


@router.delete("/licitacoes/{licitacao_id}/items/{item_id}")
async def delete_item(licitacao_id: int, item_id: int, session: AsyncSession = Depends(get_session)):
    item = await session.get(LicitacaoItem, item_id)
    if not item:
        raise ItemNotFound(item_id)
    if item.licitacao_id != licitacao_id:
        raise ItemMismatch()

    await session.delete(item)
    await session.commit()
    return {"status": "deleted"}


@router.delete("/licitacoes/{licitacao_id}/items")
async def delete_all_items(licitacao_id: int, session: AsyncSession = Depends(get_session)):
    items = await session.exec(select(LicitacaoItem).where(LicitacaoItem.licitacao_id == licitacao_id))
    for item in items:
        await session.delete(item)
    await session.commit()
    return {"status": "all_deleted"}


@router.post("/licitacoes/{licitacao_id}/items/extract")
async def extract_items_from_pdf(
    licitacao_id: int,
    session: AsyncSession = Depends(get_session)
):
    from fastapi import UploadFile, File
    # Note: file parameter handled by FastAPI dependency injection
    from services.pdf_extractor import PDFExtractor
    service = PDFExtractor()
    try:
        # This will need the file parameter added properly
        pass
    finally:
        await service.close()


# ─── Editais ──────────────────────────────────────────────────────────────────

@router.get("/licitacoes/{licitacao_id}/editais")
async def get_licitacao_attachments(licitacao_id: int, session: AsyncSession = Depends(get_session)):
    licitacao = await session.get(Licitacao, licitacao_id)
    if not licitacao:
        return []

    if "transferegov" in licitacao.pncp_id or "google" in licitacao.pncp_id:
        return []

    from services.pncp_client import PNCPClient
    client = PNCPClient()
    try:
        versions = await client.fetch_edital_versions(licitacao.pncp_id)
        return versions
    finally:
        await client.close()


@router.get("/licitacoes/{id}/editais-v2")
async def get_licitacao_editais(id: int, session: AsyncSession = Depends(get_session)):
    """Retorna histórico de editais com cache local."""
    licitacao = await session.get(Licitacao, id)
    if not licitacao:
        return []

    db_versions = await session.exec(
        select(EditalVersion).where(EditalVersion.licitacao_id == id).order_by(EditalVersion.versao.desc())
    )
    versions = db_versions.all()

    if not versions:
        from services.pncp_client import PNCPClient
        client = PNCPClient()
        try:
            versions_data = await client.fetch_edital_versions(licitacao.pncp_id)
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


# ─── Impugnações ──────────────────────────────────────────────────────────────

@router.post("/licitacoes/{id}/impugnacoes")
async def create_impugnacao(id: int, data: ImpugnacaoCreate, session: AsyncSession = Depends(get_session)):
    imp = ImpugnacaoEsclarecimento(
        licitacao_id=id,
        tipo=data.tipo.value,
        texto=data.texto,
        status="rascunho"
    )
    session.add(imp)
    await session.commit()
    await session.refresh(imp)
    return imp


@router.get("/licitacoes/{id}/impugnacoes")
async def list_impugnacoes(id: int, session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(ImpugnacaoEsclarecimento).where(ImpugnacaoEsclarecimento.licitacao_id == id)
    )
    return result.all()


# ─── Proposta ─────────────────────────────────────────────────────────────────

@router.post("/licitacoes/{licitacao_id}/proposal")
async def generate_proposal(
    licitacao_id: int,
    request: ProposalRequest,
    session: AsyncSession = Depends(get_session)
):
    licitacao = await session.get(Licitacao, licitacao_id)
    if not licitacao:
        raise LicitacaoNotFound(licitacao_id)

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


# ─── Delete & Flags ──────────────────────────────────────────────────────────

@router.delete("/licitacoes/{id}")
async def delete_licitacao(id: int, session: AsyncSession = Depends(get_session)):
    licitacao = await session.get(Licitacao, id)
    if not licitacao:
        raise LicitacaoNotFound(id)

    items = await session.exec(select(LicitacaoItem).where(LicitacaoItem.licitacao_id == id))
    for item in items:
        await session.delete(item)

    versions = await session.exec(select(EditalVersion).where(EditalVersion.licitacao_id == id))
    for v in versions:
        await session.delete(v)

    impugnacoes = await session.exec(select(ImpugnacaoEsclarecimento).where(ImpugnacaoEsclarecimento.licitacao_id == id))
    for imp in impugnacoes:
        await session.delete(imp)

    await session.delete(licitacao)
    await session.commit()
    return {"status": "deleted"}


@router.patch("/licitacoes/{id}/clear-update-flag")
async def clear_update_flag(id: int, session: AsyncSession = Depends(get_session)):
    licitacao = await session.get(Licitacao, id)
    if licitacao:
        licitacao.edital_atualizado = False
        session.add(licitacao)
        await session.commit()
    return {"status": "success"}
