import asyncio
from database import get_engine
from models import Licitacao
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

async def run_fix():
    engine = await get_engine()
    async with AsyncSession(engine) as session:
        # Move approved items from 'radar' to 'analise'
        await session.execute(
            update(Licitacao)
            .where(Licitacao.status == "aprovado")
            .where(Licitacao.pipeline_stage == "radar")
            .values(pipeline_stage="analise")
        )
        await session.commit()
        print("Pipeline stages synchronized for approved items.")

if __name__ == "__main__":
    asyncio.run(run_fix())
