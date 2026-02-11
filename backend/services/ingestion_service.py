import asyncio
import logging
import scraper
import pncp_client

logger = logging.getLogger("IngestionService")

class IngestionService:
    @staticmethod
    async def buscar_todas_oportunidades():
        """
        Coleta dados de múltiplas fontes de forma resiliente.
        Retorna lista unificada de dicionários.
        """
        print("🌍 [Ingestion] Iniciando varredura híbrida...")
        
        # 1. Google News Scraper
        try:
            dados_scraper = await scraper.buscar_licitacoes_gov() or []
        except Exception as e:
            logger.error(f"Falha no Scraper: {e}")
            dados_scraper = []

        # 2. PNCP API Oficial
        try:
            client_pncp = pncp_client.PNCPClient()
            # Executa em thread separada pois requests é síncrono
            dados_pncp = await asyncio.to_thread(client_pncp.buscar_oportunidades_recentes)
        except Exception as e:
            logger.error(f"Falha no PNCP: {e}")
            dados_pncp = []
            
        total = len(dados_scraper) + len(dados_pncp)
        print(f"📊 [Ingestion] Total coletado: {total} (Scraper={len(dados_scraper)} | PNCP={len(dados_pncp)})")
        
        return dados_scraper + dados_pncp
