import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://admin:admin123@127.0.0.1:5432/licitacoes"

async def main():
    try:
        engine = create_async_engine(DATABASE_URL, echo=False)
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT * FROM agent_messages ORDER BY created_at DESC LIMIT 5"))
            rows = result.fetchall()
            print("--- AGENT MESSAGES (V4) ---")
            for row in rows:
                print(row)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
