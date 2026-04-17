from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_team_participant_or_jury, get_current_user
from app.core.socket import sio
from app.db.db import get_async_db
from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageCreate, MessageRead

router = APIRouter(tags=["chat"])


@router.post("/", response_model=MessageRead)
async def create_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> Message:
    await assert_team_participant_or_jury(db, current_user, payload.team_id)
    message = Message(team_id=payload.team_id, author_id=current_user.id, text=payload.text)
    db.add(message)
    await db.commit()
    await db.refresh(message)

    await sio.emit(
        "new_message",
        {
            "id": message.id,
            "team_id": message.team_id,
            "author_id": str(message.author_id),
            "text": message.text,
            "created_at": message.created_at.isoformat(),
        },
        room=f"team_{payload.team_id}",
    )
    return message


@router.get("/{team_id}", response_model=List[MessageRead])
async def list_messages(
    team_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> List[Message]:
    await assert_team_participant_or_jury(db, current_user, team_id)
    result = await db.execute(
        select(Message).where(Message.team_id == team_id).order_by(Message.created_at.asc())
    )
    return list(result.scalars().all())
