from typing import Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import assert_team_participant_or_jury, get_current_user
from app.core.socket import sio
from app.db.db import get_async_db
from app.models.message import Message
from app.models.team_member import TeamMember, TeamMemberRole
from app.models.user import User, UserRole
from app.schemas.message import MessageCreate, MessageRead

router = APIRouter(tags=["chat"])


def _role_label(user: User, team_role: TeamMemberRole | None) -> str:
    if team_role == TeamMemberRole.CAPTAIN:
        return "капитан"
    if team_role == TeamMemberRole.MEMBER:
        return "участник"
    if user.role == UserRole.ADMIN:
        return "админ"
    if user.role == UserRole.EXPERT:
        return "жюри"
    return "участник"


def _message_to_read(message: Message, team_role: TeamMemberRole | None) -> MessageRead:
    author = message.author
    if author is None:
        return MessageRead(
            id=message.id,
            team_id=message.team_id,
            author_id=message.author_id,
            author_username="?",
            author_role_label="—",
            text=message.text,
            created_at=message.created_at,
        )
    return MessageRead(
        id=message.id,
        team_id=message.team_id,
        author_id=message.author_id,
        author_username=author.username,
        author_role_label=_role_label(author, team_role),
        text=message.text,
        created_at=message.created_at,
    )


async def _team_roles_for_authors(
    db: AsyncSession,
    team_id: int,
    author_ids: List[UUID],
) -> Dict[UUID, TeamMemberRole | None]:
    unique = list(dict.fromkeys(author_ids))
    if not unique:
        return {}
    res = await db.execute(
        select(TeamMember.user_id, TeamMember.role).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id.in_(unique),
        )
    )
    out: Dict[UUID, TeamMemberRole | None] = {uid: None for uid in unique}
    for uid, role in res.all():
        out[uid] = role
    return out


async def _load_message_with_author(db: AsyncSession, message_id: int) -> Message:
    stmt = (
        select(Message)
        .where(Message.id == message_id)
        .options(selectinload(Message.author))
    )
    return (await db.execute(stmt)).scalar_one()


@router.post("/", response_model=MessageRead)
async def create_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> MessageRead:
    await assert_team_participant_or_jury(db, current_user, payload.team_id)
    message = Message(team_id=payload.team_id, author_id=current_user.id, text=payload.text)
    db.add(message)
    await db.commit()
    await db.refresh(message)

    fresh = await _load_message_with_author(db, message.id)
    roles = await _team_roles_for_authors(db, payload.team_id, [fresh.author_id])
    read = _message_to_read(fresh, roles.get(fresh.author_id))

    await sio.emit(
        "new_message",
        read.model_dump(mode="json"),
        room=f"team_{payload.team_id}",
    )
    return read


@router.get("/{team_id}", response_model=List[MessageRead])
async def list_messages(
    team_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> List[MessageRead]:
    await assert_team_participant_or_jury(db, current_user, team_id)
    result = await db.execute(
        select(Message)
        .where(Message.team_id == team_id)
        .options(selectinload(Message.author))
        .order_by(Message.created_at.asc())
    )
    messages = list(result.scalars().all())
    author_ids = [m.author_id for m in messages]
    roles = await _team_roles_for_authors(db, team_id, author_ids)
    return [_message_to_read(m, roles.get(m.author_id)) for m in messages]
