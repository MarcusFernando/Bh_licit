"""
Router: Pipeline Kanban — Board de gestão visual.
"""
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from infra.database import get_session
from domain.models import Licitacao

router = APIRouter(prefix="/api", tags=["Pipeline"])


@router.get("/pipeline/items")
async def get_pipeline_items(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Licitacao))
    all_items = result.all()

    kanban: dict = {"recebido": [], "analise": [], "aprovado": [], "em_proposta": [], "rejeitado": []}

    for item in all_items:
        status = item.status or "recebido"
        card = {
            "id": item.id,
            "titulo": item.titulo,
            "orgao_nome": item.orgao_nome,
            "estado_sigla": item.estado_sigla,
            "data_publicacao": str(item.data_publicacao),
            "priority": item.priority,
            "score": item.score,
            "link_edital": item.link_edital,
            "status": item.status,
        }
        kanban[status if status in kanban else "recebido"].append(card)

    return kanban
