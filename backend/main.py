from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from arq import create_pool
from arq.connections import RedisSettings
import os
import models
from database import engine, get_db

# Criação das tabelas (Idealmente use Alembic depois)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BH Licit - API de Licitações (V2)")

origins = ["*"]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True, 
    allow_methods=["*"], allow_headers=["*"]
)

# Configuração do Redis para o Arq
REDIS_HOST = os.getenv("REDIS_HOST", "licitacoes_redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

async def get_redis_pool():
    return await create_pool(RedisSettings(host=REDIS_HOST, port=REDIS_PORT))

@app.get("/")
def read_root():
    return {"message": "Sistema BH Licit Online 🚀 (Worker Enabled)"}

@app.post("/rodar-robo/")
async def rodar_robo_licitacoes():
    """
    Dispara o robô em segundo plano via Redis.
    Não trava a API.
    """
    try:
        redis = await get_redis_pool()
        # Enfileira o job 'task_processar_licitacoes' no worker
        # Definimos um job_id único ou deixamos gerar auto
        job = await redis.enqueue_job('task_processar_licitacoes', batch_id='manual_trigger')
        await redis.close()
        return {"status": "sucesso", "mensagem": "Robô iniciado em background!", "job_id": job.job_id}
    except Exception as e:
        return {"status": "erro", "mensagem": f"Falha ao conectar no Redis: {str(e)}"}

from arq.jobs import Job

@app.get("/job-status/{job_id}")
async def get_job_status(job_id: str):
    """
    Verifica o status de um job no Redis (arq).
    Retorna: queued, in_progress, complete, not_found, ou error.
    """
    try:
        redis = await get_redis_pool()
        job = Job(job_id, redis)
        
        # Tenta pegar status
        status = await job.status()
        
        result = None
        if status == 'complete':
            try:
                # Se completo, pega o resultado (pode dar erro se expirou)
                result = await job.result(timeout=0)
            except:
                result = "Resultado expirado ou indisponível"
                
        await redis.close()
        
        return {"job_id": job_id, "status": status, "result": result}
        
    except Exception as e:
        return {"job_id": job_id, "status": "error", "details": str(e)}

@app.get("/licitacoes/")
def listar_licitacoes(db: Session = Depends(get_db)):
    items = db.query(models.Licitacao).order_by(models.Licitacao.id.desc()).all()
    # Mapeia as colunas do DB do Bryan para as chaves que o nosso Frontend V2 espera
    resultado_formatado = []
    for item in items:
        resultado_formatado.append({
            "id": item.id,
            "titulo": item.titulo,
            "link_edital": item.link_edital,
            "orgao": item.orgao_nome,       # Mapeamento
            "descricao": getattr(item, 'titulo', ''),  # Bryan DB não tem descrição longa em licitacao, usamos titulo ou edital
            "resumo_ia": item.resumo_ia,
            "score_interesse": item.score,  # Mapeamento
            "risco": item.risco,
            "analisado": True if item.resumo_ia else False,
            "data_abertura": getattr(item, 'data_abertura_proposta', getattr(item, 'data_publicacao', '')),
            "valor_estimado": "N/A",        # Bryan DB não tem valor_estimado na Licitacao
            "created_at": item.created_at,
            "pncp_id": item.pncp_id,
            "status": item.status,
            "priority": item.priority
        })
    return resultado_formatado

@app.delete("/licitacoes/{item_id}")
def delete_licitacao(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Licitacao).filter(models.Licitacao.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return {"status": "deleted", "id": item_id}

from services.ai_service import AIService

@app.post("/licitacoes/{item_id}/retry")
async def retry_analysis(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Licitacao).filter(models.Licitacao.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Reconstrói formato esperado pelo AI Service
    mock_data = [{
        "titulo": item.titulo,
        "resumo": item.descricao,
        "link": item.link_edital,
        "temp_id": "retry_1"
    }]

    print(f"🔄 Retrying analysis for item {item_id}...")
    resultados = await AIService.analisar_oportunidades(mock_data)
    
    if resultados:
        analise = resultados[0]
        # Atualiza Banco (campos novos)
        item.resumo_ia = analise.get("resumo")
        item.score = int(analise.get("nota", 0))
        item.risco = analise.get("risco")
        # Analisado não existe mais como boolean, é inferido
        db.commit()
        
        # Retorna chaves compatíveis com o Frontend
        return {
            "status": "updated", 
            "data": {
                "resumo_ia": analise.get("resumo"),
                "score_interesse": analise.get("nota"),
                "risco": analise.get("risco")
            }
        }
    else:
        raise HTTPException(status_code=500, detail="AI Analysis failed again")

from fastapi import File, UploadFile
from services import pdf_service
from ai_agent import analisar_edital_completo
import json

@app.post("/tools/read-edital")
async def read_edital_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Recebe um PDF, extrai texto, passa na IA e salva como Licitação.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos.")
    
    # 1. Ler arquivo
    contents = await file.read()
    
    # 2. Extrair Texto
    texto_pdf = pdf_service.extract_text_from_pdf(contents)
    if not texto_pdf or len(texto_pdf) < 50:
        raise HTTPException(status_code=400, detail="PDF vazio ou ilegível (Imagem ou SCAN?)")
        
    # 3. Analisar com IA
    print("🧠 Analisando Edital PDF...")
    dados_ia = await analisar_edital_completo(texto_pdf)
    
    if "error" in dados_ia:
         raise HTTPException(status_code=500, detail="Erro na IA ao ler edital.")

    # 4. Salvar no Banco
    import hashlib
    hash_id = hashlib.md5(f"UPLOAD_{file.filename}".encode()).hexdigest()[:20]
    
    novo_item = models.Licitacao(
        pncp_id=f"upload_{hash_id}",
        titulo=f"Edital PDF: {dados_ia.get('objeto', 'Sem Objeto')[:100]}",
        orgao_nome=dados_ia.get('orgao', 'Desconhecido'),
        estado_sigla="BR", # Default para upload PDF
        link_edital=f"upload://{file.filename}",
        is_me_epp_exclusive=False,
        status='pendente',
        priority='Alta',
        score=100, # Assume alto interesse pois foi upload manual
        resumo_ia=f"Edital: {dados_ia.get('edital')}. Valor: {dados_ia.get('valor_estimado')}",
        risco="Nenhum (Upload Manual)",
    )
    
    db.add(novo_item)
    db.commit()
    db.refresh(novo_item)
    
    # Retorna chaves mapeadas pro front
    return {"status": "sucesso", "data": dados_ia, "id": novo_item.id}

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MessageCreate(BaseModel):
    sender: str
    content: str
    media_url: Optional[str] = None
    requires_approval: Optional[bool] = False

@app.get("/api/messages")
def list_messages(db: Session = Depends(get_db)):
    """Retorna o histórico de mensagens da Mente Coletiva"""
    return db.query(models.AgentMessage).order_by(models.AgentMessage.id.asc()).all()

@app.post("/api/messages")
def send_message(msg: MessageCreate, db: Session = Depends(get_db)):
    """Envia uma mensagem no canal coletivo"""
    import datetime
    agora = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    novo = models.AgentMessage(
        sender=msg.sender,
        content=msg.content,
        media_url=msg.media_url,
        requires_approval=msg.requires_approval,
        approval_status="pending" if msg.requires_approval else "approved",
        created_at=agora
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

class ApprovalUpdate(BaseModel):
    status: str # "approved" or "rejected"

@app.post("/api/messages/{message_id}/approve")
def approve_message(message_id: int, approval: ApprovalUpdate, db: Session = Depends(get_db)):
    """Atualiza o status de aprovação de uma mensagem"""
    msg = db.query(models.AgentMessage).filter(models.AgentMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if approval.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    msg.approval_status = approval.status
    db.commit()
    return {"status": "success", "approval_status": msg.approval_status}