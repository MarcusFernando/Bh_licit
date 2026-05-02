import httpx
import asyncio
import json

async def fetch_schema():
    url = "https://pncp.gov.br/api/consulta/v3/api-docs"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            paths = list(data.get("paths", {}).keys())
            # Save relevant paths
            target = "/v1/contratacoes/publicacao"
            print(f"\nDETAILS FOR {target}:")
            details = data.get("paths", {}).get(target, {}).get("get", {})
            params = details.get("parameters", [])
            for p in params:
                 print(f"- {p.get('name')} ({p.get('in')}): required={p.get('required')}")
        else:
            print("Failed to fetch schema")

if __name__ == "__main__":
    asyncio.run(fetch_schema())
