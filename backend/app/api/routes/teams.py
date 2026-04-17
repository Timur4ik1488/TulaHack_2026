from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, is_user_admin
from app.db.db import get_async_db
from app.models.message import Message
from app.models.score import Score
from app.models.team import Team
from app.models.user import User
from app.schemas.team import TeamCreate, TeamPublicRead, TeamRead, TeamUpdate

router = APIRouter(tags=["teams"])


@router.post("/", response_model=TeamRead, dependencies=[Depends(is_user_admin)])
async def create_team(payload: TeamCreate, db: AsyncSession = Depends(get_async_db)) -> Team:
    team = Team(**payload.model_dump())
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team


@router.get("/", response_model=List[TeamPublicRead])
async def list_teams(db: AsyncSession = Depends(get_async_db)) -> List[Team]:
    """Гости и все пользователи: только публичные поля."""
    result = await db.execute(select(Team).order_by(Team.id))
    return list(result.scalars().all())


@router.get("/{team_id}/full", response_model=TeamRead)
async def get_team_full(
    team_id: int,
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(get_current_user),
) -> Team:
    """Полная карточка (контакты, состав) — только для авторизованных."""
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team


@router.get("/{team_id}", response_model=TeamPublicRead)
async def get_team(team_id: int, db: AsyncSession = Depends(get_async_db)) -> Team:
    """Публичная карточка команды (без контактов и состава)."""
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team


@router.patch("/{team_id}", response_model=TeamRead, dependencies=[Depends(is_user_admin)])
async def update_team(
    team_id: int,
    payload: TeamUpdate,
    db: AsyncSession = Depends(get_async_db),
) -> Team:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return team
    if "name" in data:
        exists = await db.execute(
            select(Team).where(Team.name == data["name"], Team.id != team_id)
        )
        if exists.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Team name already exists"
            )
    for k, v in data.items():
        setattr(team, k, v)
    await db.commit()
    await db.refresh(team)
    return team


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(is_user_admin)],
)
async def delete_team(team_id: int, db: AsyncSession = Depends(get_async_db)) -> None:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    await db.execute(delete(Score).where(Score.team_id == team_id))
    await db.execute(delete(Message).where(Message.team_id == team_id))
    await db.execute(delete(Team).where(Team.id == team_id))
    await db.commit()
