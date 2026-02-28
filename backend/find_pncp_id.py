import httpx
import asyncio

async def test_pncp():
    # Licitação 676 - Find its PNCP ID
    # In my DB it's likely something like CNPJ/ANO/SEQ
    # Let's assume we know it or search for it.
    
    # I'll use the ID 676 to find the pncp_id in DB
    pncp_id = "04128547000108-1-000004-2025" # Just a guess for test
    # Actually, I'll find it from DB
    from database import get_session
    from models import Licitacao
    from sqlmodel import select
    
    async for session in get_session():
        l = await session.get(Licitacao, 676)
        if l:
            print(f"PNCP ID: {l.pncp_id}")
            cnpj, ano, seq = l.pncp_id.split("-")[:3] # Simplified
            # Correct split: PNCP ID is usually CNPJ-ANO-SEQ
            parts = l.pncp_id.split("-")
            cnpj = parts[0]
            # ano is usually parts[2]? No, parts[1] is type? 
            # Pattern: {cnpj}-{ano}-{seq}?
            # Let's see the pncp_id format
            print(f"Parts: {parts}")

if __name__ == "__main__":
    asyncio.run(test_pncp())
