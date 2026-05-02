import asyncio
from database import engine
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession

async def add_columns():
    try:
        async with engine.begin() as conn:
            # Check and add columns ignoring error if they already exist
            try:
                await conn.execute(text("ALTER TABLE licitacao ADD COLUMN resumo_ia TEXT"))
                print("Column 'resumo_ia' added")
            except Exception as e:
                print("Failed or already exists resumo_ia: ", e)
            
            try:
                await conn.execute(text("ALTER TABLE licitacao ADD COLUMN risco VARCHAR"))
                print("Column 'risco' added")
            except Exception as e:
                print("Failed or already exists risco: ", e)
                
            print("✅ Migration complete!")
    except Exception as e:
        print("Migration error: ", e)

if __name__ == "__main__":
    asyncio.run(add_columns())
