import asyncio
import httpx
import os

async def test_proposal_generation():
    print("Testing Proposal Generation...")
    
    # Mock data
    licitacao_id = 724 # Assuming this ID exists from previous tests
    prices = {
        1: 10.50,
        2: 500.00
    }
    
    async with httpx.AsyncClient() as client:
        url = f"http://127.0.0.1:8000/api/licitacoes/{licitacao_id}/proposal"
        print(f"POST {url}")
        
        try:
            res = await client.post(url, json={"prices": prices}, timeout=60.0)
            print(f"Status: {res.status_code}")
            
            if res.status_code == 200:
                print("Success! Downloading file...")
                filename = "test_proposal.docx"
                with open(filename, "wb") as f:
                    f.write(res.content)
                print(f"Saved to {filename}. Size: {os.path.getsize(filename)} bytes")
            else:
                print(f"Error: {res.text}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_proposal_generation())
