import asyncio
from sqlalchemy import select, func
from database import get_engine
from models import Licitacao
from sqlalchemy.ext.asyncio import AsyncSession

async def check_data():
    engine = await get_engine()
    async with AsyncSession(engine) as session:
        # Total count
        total = await session.execute(select(func.count(Licitacao.id)))
        print(f"Total Items in DB: {total.one()}")

        # All items status
        items = await session.execute(select(Licitacao.id, Licitacao.status, Licitacao.pipeline_stage, Licitacao.titulo))
        print("\n--- All Items Status ---")
        for l_id, status, stage, titulo in items.all():
            print(f"ID: {l_id}, Status: {status}, Stage: {stage}, Title: {titulo[:30]}...")

        # Pipeline Items Filter Test
        statement = select(Licitacao).where(
            (Licitacao.status == "aprovado") | (Licitacao.pipeline_stage != "radar")
        )
        res = await session.execute(statement)
        found = res.scalars().all()
        print(f"\nItems found for Pipeline Query: {len(found)}")
        for i in found:
            print(f"ID: {i.id}, Status: {i.status}, Stage: {i.pipeline_stage}")

        # Test the chart query
        from sqlalchemy import text
        print("\n--- Testing Top Orgaos Query ---")
        try:
            top_orgaos_res = await session.execute(
                select(Licitacao.orgao_nome, func.sum(Licitacao.valor_estimado_total).label("total_val"))
                .group_by(Licitacao.orgao_nome)
                .order_by(text("total_val DESC"))
                .limit(5)
            )
            for row in top_orgaos_res.all():
                print(f"Orgao: {row[0]}, Value: {row[1]}")
        except Exception as e:
            print(f"Error in Top Orgaos query: {e}")

if __name__ == "__main__":
    asyncio.run(check_data())
