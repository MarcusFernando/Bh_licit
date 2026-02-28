import httpx
import asyncio

async def test_fetch():
    async with httpx.AsyncClient() as client:
        r = await client.get("http://127.0.0.1:8000/api/licitacoes/1/items")
        items = r.json()
        for i in items[:5]:
            print(f"ID {i['id']} - Item {i['numero_item']}: {i['descricao'][:20]} - Price: {i['valor_unitario']}")

if __name__ == "__main__":
    asyncio.run(test_fetch())
