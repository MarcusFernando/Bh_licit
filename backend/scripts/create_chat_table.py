import asyncio
from database import engine
from sqlmodel import SQLModel
# Import all models to ensure they are registered with SQLModel
from models import Licitacao, LicitacaoItem, AgentMessage

async def create_tables():
    async with engine.begin() as conn:
        print("Creating tables...")
        await conn.run_sync(SQLModel.metadata.create_all)
        print("Tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables())
