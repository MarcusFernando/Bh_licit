import asyncio
from database import get_session
from sqlmodel import select
from models import Licitacao

async def list_licitacoes():
    async for session in get_session():
        result = await session.exec(select(Licitacao).limit(10).order_by(Licitacao.data_publicacao.desc()))
        licitacoes = result.all()
        
        print(f"Found {len(licitacoes)} recent licitations:")
        for lic in licitacoes:
            print(f"ID: {lic.id} | PNCP: {lic.pncp_id} | Title: {lic.titulo[:50]}...")

if __name__ == "__main__":
    asyncio.run(list_licitacoes())
