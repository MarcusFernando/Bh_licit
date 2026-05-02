"""
Router: Análise de IA — Endpoint de análise neural de licitações.
"""
import logging
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from infra.database import get_session
from domain.models import Licitacao, LicitacaoItem
from domain.exceptions import LicitacaoNotFound

logger = logging.getLogger("AnalysisRouter")

router = APIRouter(prefix="/api", tags=["Análise IA"])


@router.post("/licitacoes/{licitacao_id}/analyze")
async def analyze_licitacao_endpoint(
    licitacao_id: int,
    session: AsyncSession = Depends(get_session)
):
    licitacao = await session.get(Licitacao, licitacao_id)
    if not licitacao:
        raise LicitacaoNotFound(licitacao_id)

    from services.llm_engine import LLMEngine
    engine = LLMEngine()

    try:
        # 1. Tentar ler o PDF para análise profunda
        full_text = ""
        source_label = "APENAS DADOS BÁSICOS (PDF não disponível)"

        if licitacao.link_edital:
            try:
                import httpx
                from pypdf import PdfReader
                import io

                logger.info(f"📥 Download do edital: {licitacao.link_edital}")
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/pdf,application/octet-stream,text/html"
                }

                # Detectar link PNCP e buscar PDF real
                final_pdf_url = licitacao.link_edital
                if "pncp.gov.br/app/editais/" in (licitacao.link_edital or ""):
                    try:
                        logger.info("🔍 Link PNCP detectado. Buscando PDF via API...")
                        parts = [p for p in licitacao.link_edital.split('/') if p]
                        if len(parts) >= 3:
                            seq = parts[-1]
                            ano = parts[-2]
                            cnpj = parts[-3]

                            for api_type in ["compras", "licitacoes"]:
                                api_url = f"https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/{api_type}/{ano}/{seq}/arquivos"
                                async with httpx.AsyncClient(timeout=10.0) as api_client:
                                    api_resp = await api_client.get(api_url)
                                    if api_resp.status_code == 200:
                                        arquivos = api_resp.json()
                                        editais = [
                                            a for a in arquivos
                                            if "edital" in a.get("titulo", "").lower() or
                                               "edital" in a.get("tipoDocumentoNome", "").lower()
                                        ]
                                        if editais:
                                            final_pdf_url = editais[0].get("url") or editais[0].get("uri")
                                            logger.info(f"🎯 PDF via API PNCP ({api_type}): {final_pdf_url}")
                                            break
                    except Exception as e:
                        logger.warning(f"⚠️ Falha ao buscar PDF na API PNCP: {e}")

                async with httpx.AsyncClient(timeout=90.0, follow_redirects=True, headers=headers) as client:
                    resp = await client.get(final_pdf_url)

                    content_type = resp.headers.get("Content-Type", "").lower()
                    if resp.status_code == 200 and ("pdf" in content_type or len(resp.content) > 10000):
                        logger.info(f"✅ Download concluído: {len(resp.content)} bytes.")
                        reader = PdfReader(io.BytesIO(resp.content))
                        logger.info(f"📄 PDF: {len(reader.pages)} páginas.")

                        total_pages = len(reader.pages)
                        pages_to_read = set(range(min(15, total_pages))) | set(range(max(0, total_pages-35), total_pages))

                        pdf_extracted = ""
                        for i in sorted(pages_to_read):
                            pg = reader.pages[i].extract_text()
                            if pg:
                                pdf_extracted += f"\n--- PÁGINA {i+1} ---\n{pg}"

                        if pdf_extracted:
                            full_text = pdf_extracted
                            source_label = "LIDO DO EDITAL COMPLETO (PDF)"
                    else:
                        logger.warning(f"❌ Download falhou. Status: {resp.status_code}")
            except Exception as pdf_err:
                logger.error(f"⚠️ Erro ao processar PDF: {type(pdf_err).__name__} - {pdf_err}")

        # 1.1 Fallback: usar itens do banco
        if not full_text:
            logger.info("🔍 PDF indisponível. Análise baseada nos itens do banco.")
            source_label = "BASEADA NA LISTA DE ITENS (Edital completo inacessível)"
            from sqlalchemy import select as sa_select

            stmt = sa_select(LicitacaoItem).where(LicitacaoItem.licitacao_id == licitacao_id)
            result = await session.execute(stmt)
            items = result.scalars().all()

            if items:
                full_text = "DADOS DOS ITENS CADASTRADOS:\n"
                for it in items[:200]:
                    full_text += f"Item {it.numero_item}: {it.descricao} | Qtd: {it.quantidade} | Valor: {it.valor_unitario}\n"
                logger.info(f"✅ Usando {len(items)} itens para análise.")

        # 2. Executar análise com Gemini
        details = f"Modalidade: {licitacao.categoria}. Estado: {licitacao.estado_sigla}. {licitacao.cidade}."
        analysis = await engine.analyze_licitacao(
            title=licitacao.titulo,
            organ=licitacao.orgao_nome,
            details=details,
            status=licitacao.status,
            rejection_reason=licitacao.rejection_reason,
            full_text=full_text,
            source_label_override=source_label
        )

        # 3. Atualizar banco se IA encontrou dados melhores
        updated = False
        new_me_epp = analysis.get("me_epp_status")
        if new_me_epp and new_me_epp != licitacao.me_epp_status:
            logger.info(f"✅ IA corrigiu ME/EPP: {licitacao.me_epp_status} -> {new_me_epp}")
            licitacao.me_epp_status = new_me_epp
            updated = True

        est_val = analysis.get("valor_estimado")
        if est_val and (not getattr(licitacao, 'valor_estimado_total', None)):
            try:
                licitacao.valor_estimado_total = float(est_val)
                updated = True
            except (ValueError, TypeError):
                pass

        if updated:
            session.add(licitacao)
            await session.commit()
            await session.refresh(licitacao)

        return analysis
    finally:
        await engine.close()
