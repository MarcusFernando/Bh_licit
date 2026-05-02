import httpx
import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class TransfereClient:
    """
    Client for Transfere.gov.br (Mais Brasil) API.
    Focus on 'Processo de Compra' (Purchase Processes/Tenders).
    """
    
    BASE_URL = "https://pro-siconv.estaleiro.serpro.gov.br/maisbrasil-api/v1/services/public"
    
    def __init__(self):
        self.timeout = httpx.Timeout(30.0, connect=10.0)

    async def fetch_processos(self, days: int = 7) -> List[Dict[str, Any]]:
        """
        Fetch purchase processes from the last N days.
        Note: The API usually requires specific filters like instrument or year.
        If no direct 'list by date' is broadly available without filters, 
        we might need to search by recent years and common hospital-related instrument types.
        """
        current_year = datetime.now().year
        
        # In a real scenario, we might iterate through common organ IDs or instrument types.
        # For now, we'll implement the structure to query 'processo-compra'.
        
        url = f"{self.BASE_URL}/processo-compra"
        
        # Transferegov API often uses query params for filtering.
        params = {
            "ano": current_year,
            # We can expand with more common criteria or keywords later
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.info(f"Fetching Transfere.gov.br processes for year {current_year}")
                # Note: SERPRO APIs often requires basic auth or client certificates in some cases, 
                # but these 'public' ones are usually open.
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    # Transferegov structure is usually a list under a main key
                    items = data if isinstance(data, list) else data.get('itens', [])
                    
                    logger.info(f"Retrieved {len(items)} items from Transfere.gov.br")
                    return self._map_to_internal(items)
                else:
                    logger.error(f"Transferegov API error: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"Failed to fetch from Transfere.gov.br: {str(e)}")
            return []

    def _map_to_internal(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Maps Transferegov fields to our internal Licitacao schema.
        """
        internal_items = []
        for item in items:
            try:
                # Transferegov field mapping (estimated based on API docs)
                # Fields like 'objeto', 'numeroProcesso', 'nomeOrgao'
                item_id = item.get('id', item.get('numeroProcesso', ''))
                if not item_id:
                    continue
                    
                internal_items.append({
                    "pncp_id": f"transferegov-{item_id}",
                    "titulo": item.get("objeto", item.get("descricao", "Sem título")),
                    "orgao_nome": item.get("nomeOrgao", "Órgão não informado"),
                    "orgao_cnpj": item.get("cnpjOrgao", ""),
                    "data_publicacao": item.get("dataPublicacao", datetime.now().isoformat()),
                    "link_edital": f"https://www.transferegov.sistema.gov.br/consulta-publica/{item_id}",
                    "estado_sigla": item.get("uf", "BR"),
                    "cidade": item.get("municipio", ""),
                    "modalidade": item.get("modalidade", "Pregão"),
                    "valor_estimado_total": item.get("valorProcesso", 0.0),
                    "fonte": "transferegov"
                })
            except Exception as e:
                logger.warning(f"Error mapping Transferegov item: {e}")
                continue
        return internal_items

async def test_transfere():
    client = TransfereClient()
    items = await client.fetch_processos(days=3)
    print(f"Found {len(items)} items")
    for i in items[:2]:
        print(f"- {i['titulo']} | {i['orgao_nome']}")

if __name__ == "__main__":
    asyncio.run(test_transfere())
