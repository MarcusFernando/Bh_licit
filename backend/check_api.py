import httpx
import asyncio

async def check_api():
    url = "http://127.0.0.1:8000/api/licitacoes"
    print(f"Checking API at {url}...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url)
            print(f"Status: {resp.status_code}")
            data = resp.json()
            print(f"Items count: {len(data)}")
            if len(data) > 0:
                print("First item:", data[0])
            else:
                print("API returned empty list.")
        except Exception as e:
            print(f"Failed to connect: {e}")

if __name__ == "__main__":
    asyncio.run(check_api())
