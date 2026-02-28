import asyncio
from sqlmodel import select
from database import get_session
from models import LicitacaoItem, Licitacao

async def find_licitacao():
    async for session in get_session():
        # Find licitacao ID for "Acetilcisteína"
        stmt = select(LicitacaoItem).where(LicitacaoItem.descricao.like("%Acetilcisteína%")).limit(1)
        item = (await session.exec(stmt)).first()
        if item:
            print(f"Licitacao ID: {item.licitacao_id}")
            return item.licitacao_id
    return None

async def test_fetch(lid):
    async with httpx.AsyncClient() as client:
        # Clear
        await client.delete(f"http://127.0.0.1:8000/api/licitacoes/{lid}/items")
        # Fetch
        r = await client.get(f"http://127.0.0.1:8000/api/licitacoes/{lid}/items")
        items = r.json()
        for i in items[:5]:
            print(f"Item {i['numero_item']}: {i['descricao']} - Price: {i['valor_unitario']}")

import httpx
if __name__ == "__main__":
    lid = asyncio.run(find_licitacao())
    if lid:
        asyncio.run(test_fetch(lid))
