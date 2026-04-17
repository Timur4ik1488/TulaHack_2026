from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import is_user_admin
from app.db.db import get_async_db
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamRead

router = APIRouter(tags=["teams"])


@router.post("/", response_model=TeamRead, dependencies=[Depends(is_user_admin)])
async def create_team(payload: TeamCreate, db: AsyncSession = Depends(get_async_db)) -> Team:
    team = Team(**payload.model_dump())
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team


@router.get("/", response_model=list[TeamRead])
async def list_teams(db: AsyncSession = Depends(get_async_db)) -> list[Team]:
    result = await db.execute(select(Team).order_by(Team.id))
    return list(result.scalars().all())
