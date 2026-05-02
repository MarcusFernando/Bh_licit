import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import sys

# DATABASE_URL provided by user: postgresql://admin:admin123@192.168.1.22:5432/licitacoes
# We need to ensure asyncpg driver usage: postgresql+asyncpg://...
DATABASE_URL = "postgresql+asyncpg://admin:admin123@192.168.1.22:5432/licitacoes"

async def test_connection():
    print(f"Testing connection to: {DATABASE_URL}")
    try:
        engine = create_async_engine(DATABASE_URL, echo=False)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("✅ SUCCESS! Connected to Marcus's PostgreSQL.")
            
            # Optional: Check if tables exist
            try:
                result = await conn.execute(text("SELECT count(*) FROM licitacao"))
                count = result.scalar()
                print(f"📊 Found 'licitacao' table with {count} rows.")
            except Exception as e:
                print(f"⚠️ Connected, but failed to query 'licitacao' table: {e}")
                print("Maybe the table hasn't been created yet? That's fine for now.")
                
    except Exception as e:
        print(f"❌ CONNECTION FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_connection())
