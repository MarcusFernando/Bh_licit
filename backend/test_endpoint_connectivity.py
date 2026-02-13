import asyncio
import httpx

async def test_endpoint():
    print("Testing API connectivity...")
    async with httpx.AsyncClient() as client:
        # 1. Get a licitacao ID first
        try:
            res_list = await client.get("http://127.0.0.1:8000/api/licitacoes?limit=1")
            if res_list.status_code != 200:
                print(f"Failed to list licitacoes: {res_list.status_code}")
                return
            
            data = res_list.json()
            items = data.get("items", [])
            if not items:
                print("No licitacoes found to test.")
                return
            
            licitacao_id = items[0]["id"]
            print(f"Testing with Licitacao ID: {licitacao_id}")

            # 2. Call items endpoint
            url = f"http://127.0.0.1:8000/api/licitacoes/{licitacao_id}/items"
            print(f"GET {url}")
            res_items = await client.get(url, timeout=60.0)
            
            print(f"Status: {res_items.status_code}")
            if res_items.status_code == 200:
                print(f"Response: {res_items.json()}")
            else:
                print(f"Error: {res_items.text}")

        except Exception as e:
            print(f"Connection Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_endpoint())
