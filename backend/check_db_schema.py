import asyncio
from sqlalchemy import inspect
from database import engine, init_db

async def check_schema():
    print("Checking database schema...")
    async with engine.begin() as conn:
        def get_tables(sync_conn):
            inspector = inspect(sync_conn)
            return inspector.get_table_names()
            
        tables = await conn.run_sync(get_tables)
        print(f"Tables found: {tables}")
        
        if "licitacaoitem" in tables:
            print("SUCCESS: 'licitacaoitem' table exists.")
        else:
            print("FAILURE: 'licitacaoitem' table MISSING.")
            print("Attempting to run init_db()...")
            await init_db()
            print("init_db() executed.")

if __name__ == "__main__":
    asyncio.run(check_schema())
