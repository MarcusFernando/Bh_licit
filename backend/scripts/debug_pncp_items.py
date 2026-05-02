import httpx
import asyncio
import json

async def test_api():
    cnpj = "05193115000163"
    ano = "2026"
    seq = "11"
    
    async with httpx.AsyncClient() as client:
        url_int = f"https://pncp.gov.br/pncp-api/v1/orgaos/{cnpj}/compras/{ano}/{int(seq)}/itens?pagina=1&tamanhoPagina=10"
        print(f"Testing Internal API: {url_int}")
        r = await client.get(url_int)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            items = data if isinstance(data, list) else data.get("data", [])
            if items:
                print(f"Internal API Item Keys: {list(items[0].keys())}")
                print(f"Sample Item: {json.dumps(items[0], indent=2, ensure_ascii=False)}")

if __name__ == "__main__":
    asyncio.run(test_api())
