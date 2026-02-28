import asyncio
from database import get_session, init_db
from services.pncp_client import PNCPClient
from sqlalchemy import text

async def force_populate():
    print("🚀 Initializing Database...")
    await init_db()
    
    # Manually create a session since we aren't in a request context
    from database import engine
    from sqlmodel.ext.asyncio.session import AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        print("📡 Starting Force Fetch (15 days)...")
        client = PNCPClient()
        try:
            count = await client.fetch_and_process(session, days=15)
            print(f"✅ Fetch Complete! New Items: {count}")
            
            # Verify DB content
            result = await session.exec(text("SELECT count(*) FROM licitacao"))
            total = result.one()[0]
            print(f"📊 Total Licitacoes in DB: {total}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            await client.close()

if __name__ == "__main__":
    asyncio.run(force_populate())
