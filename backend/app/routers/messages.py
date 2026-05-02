"""
Router: Mensagens — Chat neural entre agentes e operadores.
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from infra.database import get_session
from domain.models import AgentMessage
from domain.schemas import MessageCreate, MessageApproval

router = APIRouter(prefix="/api", tags=["Mensagens"])


@router.get("/messages")
async def get_messages(session: AsyncSession = Depends(get_session)):
    statement = select(AgentMessage).order_by(AgentMessage.id.desc()).limit(50)
    results = await session.exec(statement)
    messages = results.all()
    messages.reverse()
    return messages


@router.post("/messages")
async def create_message(msg: MessageCreate, session: AsyncSession = Depends(get_session)):
    new_msg = AgentMessage(
        sender=msg.sender,
        content=msg.content,
        media_url=msg.media_url,
        requires_approval=msg.requires_approval,
        created_at=datetime.utcnow().isoformat()
    )
    session.add(new_msg)
    await session.commit()
    await session.refresh(new_msg)
    return new_msg


@router.post("/messages/{msg_id}/approve")
async def approve_message(
    msg_id: int, action: MessageApproval,
    session: AsyncSession = Depends(get_session)
):
    msg = await session.get(AgentMessage, msg_id)
    if not msg:
        return {"error": "Message not found"}
    msg.approval_status = action.status
    await session.commit()
    return msg


@router.post("/sync")
async def sync_all(days: int = 3, session: AsyncSession = Depends(get_session)):
    """Sincronização geral PNCP + fontes."""
    from services.ingestion_service import IngestionService
    try:
        count = await IngestionService.sync_all(session, days=days)
        return {"status": "success", "new_items": count}
    except Exception as e:
        return {"status": "error", "message": str(e)}
