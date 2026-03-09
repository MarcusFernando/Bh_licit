import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def migrate():
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        try:
            print("Adding column 'modo_disputa'...")
            await conn.execute(text("ALTER TABLE licitacao ADD COLUMN modo_disputa VARCHAR"))
            print("Column 'modo_disputa' added.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Column 'modo_disputa' already exists.")
            else:
                print(f"Error: {e}")

        try:
            print("Adding column 'data_abertura_proposta'...")
            await conn.execute(text("ALTER TABLE licitacao ADD COLUMN data_abertura_proposta TIMESTAMP WITHOUT TIME ZONE"))
            print("Column 'data_abertura_proposta' added.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Column 'data_abertura_proposta' already exists.")
            else:
                print(f"Error: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
