"""
Router: ANVISA/CMED — Upload, busca e cruzamento de preços.
"""
from fastapi import APIRouter, Depends, UploadFile, File
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from infra.database import get_session
from domain.models import LicitacaoItem
from domain.exceptions import InvalidFileFormat

router = APIRouter(prefix="/api/anvisa", tags=["ANVISA/CMED"])


@router.post("/cmed/upload")
async def upload_cmed(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    """Upload da planilha CMED da Secretaria Executiva da ANVISA."""
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise InvalidFileFormat(".xls ou .xlsx")

    contents = await file.read()
    from services.anvisa_client import AnvisaClient
    client = AnvisaClient()
    count = await client.import_cmed_from_xls(session, file_bytes=contents)
    await client.close()

    return {
        "status": "success",
        "message": f"Importados {count} medicamentos da planilha CMED",
        "total_importados": count,
        "arquivo": file.filename
    }


@router.get("/cmed/search")
async def search_cmed(
    q: str, tipo: str = None, classe: str = None,
    limit: int = 20, session: AsyncSession = Depends(get_session)
):
    from services.anvisa_client import AnvisaClient
    results = await AnvisaClient.search_medicamentos(
        session, query=q, limit=limit,
        tipo_produto=tipo, classe_terapeutica=classe
    )
    return {
        "query": q, "total": len(results),
        "items": [
            {
                "id": m.id, "substancia": m.substancia,
                "produto": m.produto, "laboratorio": m.laboratorio,
                "apresentacao": m.apresentacao, "tipo": m.tipo_produto,
                "classe": m.classe_terapeutica,
                "pf_0": m.pf_0, "pf_17": m.pf_17, "pf_18": m.pf_18,
                "pmc_18": m.pmc_18, "cap": m.cap,
                "restricao_hospitalar": m.restricao_hospitalar,
            } for m in results
        ]
    }


@router.post("/cmed/cruzar/{licitacao_id}")
async def cruzar_licitacao_cmed(
    licitacao_id: int, session: AsyncSession = Depends(get_session)
):
    from services.anvisa_client import AnvisaClient
    result = await session.exec(
        select(LicitacaoItem).where(LicitacaoItem.licitacao_id == licitacao_id)
    )
    itens = list(result.all())
    if not itens:
        return {"error": "Nenhum item encontrado", "licitacao_id": licitacao_id}

    descricoes = [item.descricao for item in itens]
    cruzamento = await AnvisaClient.cruzar_itens_com_cmed(session, descricoes)
    total_matches = sum(1 for c in cruzamento if c["match_encontrado"])

    return {
        "licitacao_id": licitacao_id,
        "total_itens": len(itens),
        "total_com_preco_referencia": total_matches,
        "cobertura_percentual": round(total_matches / len(itens) * 100, 1) if itens else 0,
        "cruzamentos": cruzamento
    }


@router.get("/cmed/stats")
async def cmed_stats(session: AsyncSession = Depends(get_session)):
    from services.anvisa_client import AnvisaClient
    return await AnvisaClient.get_stats(session)
