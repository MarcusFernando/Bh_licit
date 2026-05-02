import httpx
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from models import Licitacao, MODALIDADE_MAP
from services.filter_engine import FilterEngine

logger = logging.getLogger("uvicorn")

class ComprasNetClient:
    """
    Client for ComprasNet (Compras.gov.br) via Dados Abertos API.
    """
    BASE_URL = "https://compras.dados.gov.br/licitacoes/v1/licitacoes.json"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def fetch_and_process(self, session: AsyncSession, days: int = 7):
        states = ["MA", "PI", "PA"]
        count_new = 0
        
        # Data Window
        start_date = datetime.now() - timedelta(days=days)
        start_str = start_date.strftime("%Y-%m-%d")
        
        for uf in states:
            try:
                # API uses offset-based pagination. For simplicity, we fetch first page (500 items usually)
                # Filter by publication date and state
                params = {
                    "data_publicacao_min": start_str,
                    "uf": uf
                }
                
                logger.info(f"Fetching ComprasNet for {uf} since {start_str}...")
                response = await self.client.get(self.BASE_URL, params=params)
                
                if response.status_code != 200:
                    logger.error(f"ComprasNet API Error {response.status_code} for {uf}")
                    continue
                    
                data = response.json()
                # ComprasNet structure: _embedded -> licitacoes
                embedded = data.get("_embedded", {})
                items = embedded.get("licitacoes", [])
                
                for item in items:
                    # PNCP ID format: {cnpj_orgao}{numero_licitacao} (or similar unique key)
                    # For ComprasNet, we can use uasg + modalidade + numero
                    uasg = item.get("uasg")
                    modalidade_cod = item.get("modalidade")
                    numero = item.get("numero_licitacao")
                    
                    # Create a unique internal ID to avoid duplicates
                    # ComprasNet often migrates to PNCP, so we check for overlap
                    internal_id = f"comprasnet-{uasg}-{modalidade_cod}-{numero}"
                    
                    existing = await session.exec(select(Licitacao).where(Licitacao.pncp_id == internal_id))
                    if existing.first():
                        continue
                        
                    titulo = item.get("objeto", "Sem objeto")
                    
                    # 1. Geographic Check (Already filtered by API, but keep for safety)
                    if not FilterEngine.check_geographic(uf):
                        continue
                        
                    # 2. Semantic Filter
                    if not FilterEngine.check_semantic(titulo):
                        status = "rejeitado"
                        reason = "Blacklist/Not Whitelisted"
                    else:
                        status = "recebido"
                        reason = None
                        
                    # 3. Gatekeeper (ME/EPP)
                    allowed, gate_reason = FilterEngine.check_gatekeeper(titulo)
                    if not allowed:
                        status = "rejeitado"
                        reason = gate_reason
                        
                    # 4. Priority
                    priority, score = FilterEngine.calculate_priority(titulo)
                    
                    # Map modality
                    modalidade_texto = MODALIDADE_MAP.get(modalidade_cod, f"Mod {modalidade_cod}")
                    
                    # Dates
                    pub_str = item.get("data_publicacao")
                    abertura_str = item.get("data_entrega_proposta") # For ComprasNet, this is often the deadline
                    
                    data_publicacao = datetime.fromisoformat(pub_str.replace("Z", "+00:00")) if pub_str else datetime.utcnow()
                    data_abertura = datetime.fromisoformat(abertura_str.replace("Z", "+00:00")) if abertura_str else None

                    # ME/EPP Status
                    titulo_upper = titulo.upper()
                    me_epp_status = "nao"
                    if "EXCLUSIVO" in titulo_upper and ("ME" in titulo_upper or "EPP" in titulo_upper):
                        me_epp_status = "exclusivo"
                    elif ("COTA" in titulo_upper or "PARCIAL" in titulo_upper or "ITENS" in titulo_upper) and ("ME" in titulo_upper or "EPP" in titulo_upper):
                        me_epp_status = "parcial"

                    new_lic = Licitacao(
                        pncp_id=internal_id,
                        numero=f"{numero}/{uasg}",
                        titulo=titulo,
                        orgao_nome=item.get("uasg_nome", f"UASG {uasg}"),
                        estado_sigla=uf,
                        data_publicacao=data_publicacao,
                        data_abertura_proposta=data_abertura,
                        modalidade=modalidade_texto,
                        modalidade_codigo=modalidade_cod,
                        link_edital=f"https://www.comprasnet.gov.br/consultaLicitacoes/download/download.asp?uasg={uasg}&modprp={modalidade_cod}&numprp={numero}",
                        status=status,
                        rejection_reason=reason,
                        priority=priority,
                        score=score,
                        me_epp_status=me_epp_status
                    )
                    
                    session.add(new_lic)
                    count_new += 1
                
                await session.commit()
                
            except Exception as e:
                logger.error(f"ComprasNet sync error for {uf}: {e}")
                
        return count_new

    async def close(self):
        await self.client.aclose()
