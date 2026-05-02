import asyncio
import os
import logging
from arq import create_pool
from arq.connections import RedisSettings
from sqlmodel.ext.asyncio.session import AsyncSession

from infra.database import engine
from domain.models import AgentMessage
from services.ingestion_service import IngestionService

# Configuração de Logging
logger = logging.getLogger("ArqWorker")

# Configuração do Redis
REDIS_HOST = os.getenv("REDIS_HOST", "licitacoes_redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

async def startup(ctx):
    logger.info("🚀 [Worker] Iniciado com sucesso! Conectado ao Redis.")

async def shutdown(ctx):
    logger.info("👋 [Worker] Encerrando atividades...")

async def task_sync_all(ctx, days: int = 3):
    """
    Tarefa periódica ou sob demanda para sincronizar todas as fontes.
    """
    logger.info(f"🔄 [Worker] Iniciando sincronização programada ({days} dias)...")
    
    try:
        async with AsyncSession(engine) as session:
            count = await IngestionService.sync_all(session, days=days)
            
            # Envia aviso no chat interno do sistema
            from datetime import datetime
            msg = AgentMessage(
                sender="Sistema (Automático)",
                content=f"🔍 Radar atualizado! Encontrei {count} novas oportunidades no PNCP e outras fontes.",
                created_at=datetime.utcnow().isoformat()
            )
            session.add(msg)
            await session.commit()
            
            logger.info(f"✅ [Worker] Sincronização concluída: {count} novos itens.")
            return {"status": "success", "new_items": count}
            
    except Exception as e:
        logger.error(f"❌ [Worker] Falha na sincronização: {str(e)}")
        return {"status": "error", "message": str(e)}

# Configuração da Classe Worker para o Arq rodar
class WorkerSettings:
    functions = [task_sync_all]
    redis_settings = RedisSettings(host=REDIS_HOST, port=REDIS_PORT)
    on_startup = startup
    on_shutdown = shutdown
    # Podemos adicionar agendamento (cron) aqui se necessário
