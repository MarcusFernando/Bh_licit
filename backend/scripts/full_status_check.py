import asyncio
from sqlalchemy import select, func
from database import get_engine
from models import Licitacao
from sqlalchemy.ext.asyncio import AsyncSession

async def run():
    engine = await get_engine()
    async with AsyncSession(engine) as session:
        # Status counts
        status_counts = await session.execute(
            select(Licitacao.status, func.count(Licitacao.id)).group_by(Licitacao.status)
        )
        print("--- Status Counts ---")
        for status, count in status_counts.all():
            print(f"{status}: {count}")

        # Stage counts
        stage_counts = await session.execute(
            select(Licitacao.pipeline_stage, func.count(Licitacao.id)).group_by(Licitacao.pipeline_stage)
        )
        print("\n--- Pipeline Stage Counts ---")
        for stage, count in stage_counts.all():
            print(f"{stage}: {count}")

        # Combination
        both = await session.execute(
            select(Licitacao.status, Licitacao.pipeline_stage, func.count(Licitacao.id))
            .group_by(Licitacao.status, Licitacao.pipeline_stage)
        )
        print("\n--- Status + Stage Counts ---")
        for status, stage, count in both.all():
            print(f"{status} | {stage}: {count}")

if __name__ == "__main__":
    asyncio.run(run())
