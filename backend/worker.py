import asyncio
from arq import create_pool
from arq.connections import RedisSettings
import os
import models
from database import SessionLocal

# Importação dos novos serviços
from services.ingestion_service import IngestionService
from services.ai_service import AIService

# Configuração do Redis
REDIS_HOST = os.getenv("REDIS_HOST", "licitacoes_redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

async def startup(ctx):
    print("🚀 Worker iniciado! Conectado ao Redis.")

async def shutdown(ctx):
    print("👋 Worker desligando...")

async def task_processar_licitacoes(ctx, batch_id: str):
    """
    Tarefa assíncrona executada em segundo plano.
    Refatorada para usar Service Layer pattern.
    """
    print(f"🔄 [Worker] Iniciando processamento do lote {batch_id}...")
    
    # 1. Coleta (Ingestion Service)
    dados_coletados = await IngestionService.buscar_todas_oportunidades()
    
    if not dados_coletados:
        print("⚠️ [Worker] Nenhuma licitação nova encontrada.")
        return "Sem dados"

    # 2. Filtragem e Persistência
    # O Worker atua como orquestrador, decidindo o que salvar
    db = SessionLocal()
    try:
        novos_para_analise = []
        # Filtra duplicados
        for item in dados_coletados:
            existe = db.query(models.Licitacao).filter(models.Licitacao.titulo == item['titulo']).first()
            if not existe:
                item['temp_id'] = str(len(novos_para_analise))
                novos_para_analise.append(item)
        
        print(f"📦 [Worker] {len(novos_para_analise)} itens novos para analisar.")
        
        if novos_para_analise:
            # Batching para IA
            tamanho_lote = 5
            for i in range(0, len(novos_para_analise), tamanho_lote):
                lote_atual = novos_para_analise[i : i + tamanho_lote]
                
                # Chama AI Service (Encapsula a complexidade do agente)
                resultados_ia = await AIService.analisar_oportunidades(lote_atual)
                
                for item_raw in lote_atual:
                    analise = next((x for x in resultados_ia if str(x.get("id_interno")) == item_raw['temp_id']), None)
                    
                    if not analise:
                         analise = {"resumo": "Processado via Contingência", "nota": 0, "risco": "Review Manual"}

                    nova_licitacao = models.Licitacao(
                        titulo=item_raw['titulo'],
                        link_edital=item_raw['link'],
                        descricao=item_raw['resumo'],
                        orgao=item_raw.get("origem", "Automacao"),
                        resumo_ia=analise.get("resumo"),
                        score_interesse=analise.get("nota"),
                        risco=analise.get("risco"),
                        analisado=True
                    )
                    db.add(nova_licitacao)
                
                db.commit()
                print(f"✅ [Worker] Lote {i} salvo no banco.")
                await asyncio.sleep(2)
            
    except Exception as e:
        print(f"❌ Erro no Worker: {e}")
        db.rollback()
    finally:
        db.close()

    return f"Processado {len(novos_para_analise)} itens."

# Configuração da Classe Worker para o Arq rodar
class WorkerSettings:
    functions = [task_processar_licitacoes]
    redis_settings = RedisSettings(host=REDIS_HOST, port=REDIS_PORT)
    on_startup = startup
    on_shutdown = shutdown
