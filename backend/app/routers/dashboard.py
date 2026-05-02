"""
Router: Dashboard Estratégico — Charts, funil, top órgãos.
"""
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from infra.database import get_session
from domain.models import Licitacao

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/dashboard/charts")
async def get_dashboard_charts(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Licitacao))
    all_items = result.all()

    stages_map = {
        "recebido":    {"label": "Captadas",    "count": 0, "value": 0.0},
        "analise":     {"label": "Em Análise",  "count": 0, "value": 0.0},
        "aprovado":    {"label": "Aprovadas",   "count": 0, "value": 0.0},
        "em_proposta": {"label": "Em Proposta", "count": 0, "value": 0.0},
        "rejeitado":   {"label": "Rejeitadas",  "count": 0, "value": 0.0},
    }
    orgaos_map: dict = {}

    for item in all_items:
        status = item.status or "recebido"
        if status in stages_map:
            stages_map[status]["count"] += 1
            est = float(item.score or 0) * 10_000
            stages_map[status]["value"] += est
            orgao = item.orgao_nome or "Desconhecido"
            orgaos_map[orgao] = orgaos_map.get(orgao, 0.0) + est

    funnel = [
        {"stage": s, "label": stages_map[s]["label"],
         "count": stages_map[s]["count"], "value": stages_map[s]["value"]}
        for s in ["recebido", "analise", "aprovado", "em_proposta"]
    ]

    top_orgaos = sorted(
        [{"name": k, "value": v} for k, v in orgaos_map.items()],
        key=lambda x: x["value"], reverse=True
    )[:5]

    return {"funnel": funnel, "top_orgaos": top_orgaos}
