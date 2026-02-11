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
    return db.query(models.Licitacao).order_by(models.Licitacao.id.desc()).all()

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
        # Atualiza Banco
        item.resumo_ia = analise.get("resumo")
        item.score_interesse = analise.get("nota")
        item.risco = analise.get("risco")
        item.analisado = True
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
    novo_item = models.Licitacao(
        titulo=f"Edital PDF: {dados_ia.get('objeto', 'Sem Objeto')[:100]}",
        orgao=dados_ia.get('orgao', 'Desconhecido'),
        descricao=dados_ia.get('objeto', 'Sem descrição'),
        link_edital=f"upload://{file.filename}", # Placeholder
        resumo_ia=f"Edital: {dados_ia.get('edital')}. Valor: {dados_ia.get('valor_estimado')}",
        score_interesse=100, # Assume alto interesse pois foi upload manual
        risco="Nenhum (Upload Manual)",
        analisado=True,
        data_abertura=dados_ia.get('data_abertura'),
        valor_estimado=str(dados_ia.get('valor_estimado'))
    )
    
    db.add(novo_item)
    db.commit()
    db.refresh(novo_item)
    
    return {"status": "sucesso", "data": dados_ia, "id": novo_item.id}