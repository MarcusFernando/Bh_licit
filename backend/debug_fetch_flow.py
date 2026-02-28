import httpx
import asyncio
from datetime import datetime, timedelta
import sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

# Mock FilterEngine logic to debug here without imports
class FilterEngine:
    WHITE_LIST = [
        "medicament", "farmac", "hospital", "enfermagem", "saude", "odontol",
        "laborator", "cirurg", "ortoped", "fisioterap", "penso", "gaze",
        "luva", "seringa", "cateter", "agulha", "algodao", "infusao",
        "sonda", "curativo", "diagnostico", "reagente", "teste rapido",
        "equipamento medico", "material medico"
    ]
    
    @staticmethod
    def check_geographic(uf: str) -> bool:
        return uf.upper() in ["MA", "PI", "PA"]

    @staticmethod
    def check_semantic(titulo: str) -> bool:
        titulo_lower = titulo.lower()
        for term in FilterEngine.WHITE_LIST:
            if term in titulo_lower:
                return True
        return False

async def debug_pncp_fetch():
    base_url = "https://pncp.gov.br/api/consulta/v1"
    states = ["MA", "PI", "PA"]
    modalities = ["6", "8", "13"] # Pregão, Dispensa, Concorrência
    
    days = 15 # Increased range to find *something*
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    start_str = start_date.strftime("%Y%m%d")
    end_str = end_date.strftime("%Y%m%d")
    
    print(f"DEBUG: Searching from {start_str} to {end_str}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for uf in states:
            for mod in modalities:
                url = f"{base_url}/contratacoes/publicacao"
                params = {
                    "dataInicial": start_str,
                    "dataFinal": end_str,
                    "uf": uf,
                    "codigoModalidadeContratacao": mod,
                    "pagina": "1",
                    "tamanhoPagina": "10"# Small page size for debug
                }
                
                print(f"\n--- Checking {uf} (Mod {mod}) ---")
                try:
                    resp = await client.get(url, params=params)
                    if resp.status_code != 200:
                        print(f"❌ Error {resp.status_code}: {resp.text[:100]}")
                        continue
                        
                    data = resp.json()
                    items = data.get("data", [])
                    total = data.get("totalRegistros", 0)
                    print(f"✅ Found {len(items)} items (Total API: {total})")
                    
                    for item in items:
                        titulo = item.get("objetoCompra", "Sem objeto")
                        orgao = item.get('orgaoEntidade', {}).get('razaoSocial', 'Desconhecido')
                        
                        # Test Filters
                        geo_pass = FilterEngine.check_geographic(uf)
                        sem_pass = FilterEngine.check_semantic(titulo)
                        
                        status = "✅ ACCEPTED" if (geo_pass and sem_pass) else "⛔ REJECTED"
                        reason = []
                        if not geo_pass: reason.append("Geo")
                        if not sem_pass: reason.append("Semantic/Whitelist")
                        
                        print(f"   [{status}] {titulo[:60]}... (Org: {orgao[:30]}) Reason: {reason}")
                        
                except Exception as e:
                    print(f"❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(debug_pncp_fetch())
