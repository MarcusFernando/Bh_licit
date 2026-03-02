import asyncio
import logging
from core.config import settings
from database import get_session
from services.pncp_client import PNCPClient
from sqlalchemy.orm import sessionmaker
from database import engine
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger("uvicorn")

async def run_scheduler():
    """
    Roda o robô a cada X minutos.
    """
    logger.info("Scheduler iniciado.")
    while True:
        try:
            logger.info("Executando tarefa agendada: PNCP Sync")
            # Cria sessão manual pois não estamos numa request
            async_session = sessionmaker(
                engine, class_=AsyncSession, expire_on_commit=False
            )
            async with async_session() as session:
                client = PNCPClient()
                count = await client.fetch_and_process(session)
                await client.close()
                logger.info(f"Sync finalizado. Novos itens: {count}")
                
        except Exception as e:
            logger.error(f"Erro no scheduler: {e}")
        
        # Espera 10 minutos (600s)
        await asyncio.sleep(600)

if __name__ == "__main__":
    asyncio.run(run_scheduler())
