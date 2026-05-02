import asyncio
from sqlmodel import select
from database import get_session
from models import LicitacaoItem

async def check_data():
    async for session in get_session():
        items = await session.exec(select(LicitacaoItem).limit(10))
        for item in items.all():
            print(f"ID: {item.id}, Desc: {item.descricao[:30]}, Price: {item.valor_unitario}")

if __name__ == "__main__":
    asyncio.run(check_data())
