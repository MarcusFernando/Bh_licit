import asyncio
import os
from database import engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import text

async def check():
    db_url = os.getenv("DATABASE_URL")
    print(f"URL being used: {db_url}")
    try:
        async with AsyncSession(engine) as session:
            result = await session.exec(text("SELECT count(*) FROM licitacao"))
            total = result.one()[0]
            print(f"Total licitacoes: {total}")
            
            res_aprovados = await session.exec(text("SELECT count(*) FROM licitacao WHERE status='aprovado'"))
            print(f"Total aprovados: {res_aprovados.one()[0]}")
            
            res_rejeitados = await session.exec(text("SELECT count(*) FROM licitacao WHERE status='rejeitado'"))
            print(f"Total rejeitados: {res_rejeitados.one()[0]}")
            
            res_alta = await session.exec(text("SELECT count(*) FROM licitacao WHERE priority='alta' AND status!='rejeitado'"))
            print(f"Total alta prioridade (nao rejeitados): {res_alta.one()[0]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
