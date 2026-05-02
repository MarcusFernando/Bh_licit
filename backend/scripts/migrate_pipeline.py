import asyncio
from sqlalchemy import text
from database import get_engine

async def migrate():
    engine = await get_engine()
    async with engine.begin() as conn:
        print("Running migration...")
        
        # Add pipeline_stage
        try:
            await conn.execute(text("ALTER TABLE licitacao ADD COLUMN pipeline_stage VARCHAR DEFAULT 'radar'"))
            print("Added column: pipeline_stage")
        except Exception as e:
            print(f"Column pipeline_stage might already exist: {e}")

        # Add valor_estimado_total
        try:
            await conn.execute(text("ALTER TABLE licitacao ADD COLUMN valor_estimado_total FLOAT DEFAULT 0.0"))
            print("Added column: valor_estimado_total")
        except Exception as e:
            print(f"Column valor_estimado_total might already exist: {e}")

        # Add valor_final_lance
        try:
            await conn.execute(text("ALTER TABLE licitacao ADD COLUMN valor_final_lance FLOAT DEFAULT 0.0"))
            print("Added column: valor_final_lance")
        except Exception as e:
            print(f"Column valor_final_lance might already exist: {e}")
            
    print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(migrate())
