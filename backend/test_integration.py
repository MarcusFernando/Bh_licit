import asyncio
import logging
import sys
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from database import init_db, engine
from services.pncp_client import PNCPClient
from sqlmodel import select
from models import Licitacao

# Configure logging to see output
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

async def get_manual_session():
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session

async def main():
    print("--- Starting Manual Integration Test ---")
    
    # 1. Init DB
    await init_db()
    
    # 2. Run Sync
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        print("Running PNCP Client...")
        client = PNCPClient()
        try:
            count = await client.fetch_and_process(session)
            print(f"Sync complete. New items: {count}")
            
            # 3. Check DB
            result = await session.exec(select(Licitacao))
            items = result.all()
            print(f"Total items in DB: {len(items)}")
            
            for item in items[:5]:
                print(f"- [{item.status}] {item.titulo} ({item.estado_sigla})")
                
        finally:
            await client.close()

if __name__ == "__main__":
    asyncio.run(main())
