import asyncio
import logging
from typing import List, Dict, Any
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from datetime import datetime

from services import scraper
from services.pncp_client import PNCPClient
from services.transfere_client import TransfereClient
from services.comprasnet_client import ComprasNetClient
from services.filter_engine import FilterEngine
from models import Licitacao

logger = logging.getLogger("IngestionService")

class IngestionService:
    @staticmethod
    async def sync_all(session: AsyncSession, days: int = 3):
        """
        Coleta dados de múltiplas fontes, filtra e salva no banco.
        Retorna o total de NOVOS itens adicionados.
        """
        print(f"🌍 [Ingestion] Iniciando sincronização global (últimos {days} dias)...")
        
        count_new = 0
        
        # 1. PNCP (API Oficial) - Já tem sua própria lógica de processamento e persistência
        try:
            client_pncp = PNCPClient()
            count_pncp = await client_pncp.fetch_and_process(session, days=days)
            count_new += count_pncp
            await client_pncp.close()
            print(f"✅ [PNCP] {count_pncp} novos itens.")
        except Exception as e:
            logger.error(f"Falha no PNCP: {e}")

        # 2. Transfere.gov.br
        try:
            client_transf = TransfereClient()
            dados_transf = await client_transf.fetch_processos(days=days)
            count_transf = 0
            
            for item in dados_transf:
                # Verificar duplicidade
                existing = await session.exec(select(Licitacao).where(Licitacao.pncp_id == item['pncp_id']))
                if existing.first():
                    continue
                
                # Aplicar Filtros e Score
                titulo = item['titulo']
                if not FilterEngine.check_semantic(titulo):
                    status = "rejeitado"
                    reason = "Blacklist/Not Whitelisted"
                else:
                    status = "recebido"
                    reason = None
                
                allowed, gate_reason = FilterEngine.check_gatekeeper(titulo)
                if not allowed:
                    status = "rejeitado"
                    reason = gate_reason
                
                priority, score = FilterEngine.calculate_priority(titulo)
                
                # Criar Objeto
                new_lic = Licitacao(
                    pncp_id=item['pncp_id'],
                    titulo=titulo,
                    orgao_nome=item['orgao_nome'],
                    orgao_cnpj=item.get('orgao_cnpj'),
                    estado_sigla=item.get('estado_sigla', 'BR'),
                    cidade=item.get('cidade'),
                    data_publicacao=datetime.fromisoformat(item['data_publicacao'].replace('Z', '+00:00')) if isinstance(item['data_publicacao'], str) else datetime.utcnow(),
                    link_edital=item.get('link_edital'),
                    modalidade=item.get('modalidade'),
                    status=status,
                    rejection_reason=reason,
                    priority=priority,
                    score=score
                )
                session.add(new_lic)
                count_transf += 1
                count_new += 1
            
            await session.commit()
            print(f"✅ [Transfere.gov] {count_transf} novos itens.")
        except Exception as e:
            logger.error(f"Falha no Transfere gov: {e}")

        # 3. Scraper (Google News)
        try:
            dados_scraper = await scraper.buscar_licitacoes_gov() or []
            count_scr = 0
            for item in dados_scraper:
                # Gerar um ID único simples para itens do scraper se não houver
                scr_id = f"scraper-{hash(item['titulo'] + item['orgao_nome'])}"
                existing = await session.exec(select(Licitacao).where(Licitacao.pncp_id == scr_id))
                if existing.first():
                    continue
                
                priority, score = FilterEngine.calculate_priority(item['titulo'])
                
                new_lic = Licitacao(
                    pncp_id=scr_id,
                    titulo=item['titulo'],
                    orgao_nome=item['orgao_nome'],
                    estado_sigla=item.get('estado_sigla', 'BR'),
                    data_publicacao=datetime.utcnow(),
                    link_edital=item.get('link_edital'),
                    status="recebido",
                    priority=priority,
                    score=score
                )
                session.add(new_lic)
                count_scr += 1
                count_new += 1
                
            await session.commit()
            print(f"✅ [Scraper] {count_scr} novos itens.")
        except Exception as e:
            logger.error(f"Falha no Scraper: {e}")

        # 4. ComprasNet (Dados Abertos)
        try:
            client_cnet = ComprasNetClient()
            count_cnet = await client_cnet.fetch_and_process(session, days=days)
            count_new += count_cnet
            await client_cnet.close()
            print(f"✅ [ComprasNet] {count_cnet} novos itens.")
        except Exception as e:
            logger.error(f"Falha no ComprasNet: {e}")

        print(f"📊 [Sync] Total: {count_new} novos itens.")
        return count_new
