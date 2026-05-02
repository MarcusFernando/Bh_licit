import asyncio
from database import engine
from sqlalchemy import text

async def migrate():
    print("Checking database columns...")
    async with engine.begin() as conn:
        # Check if column exists
        res = await conn.execute(text("PRAGMA table_info(licitacao)"))
        cols = [r[1] for r in res.fetchall()]
        print(f"Current columns: {cols}")
        
        if "is_me_epp_exclusive" not in cols:
            print("Adding column is_me_epp_exclusive...")
            await conn.execute(text("ALTER TABLE licitacao ADD COLUMN is_me_epp_exclusive BOOLEAN DEFAULT FALSE"))
            print("Column added successfully!")
        else:
            print("Column already exists.")

if __name__ == "__main__":
    asyncio.run(migrate())
