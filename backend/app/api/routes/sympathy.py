from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.db import get_async_db
from app.models.sympathy_vote import SympathyDimension, SympathyVote
from app.models.team import Team
from app.models.user import User
from app.schemas.sympathy import (
    SympathyLeaderboardResponse,
    SympathyLeaderboardRow,
    SympathyTeamTotal,
    SympathyVoteCreate,
    SympathyVoteRead,
)

router = APIRouter(tags=["sympathy"])

_DIM = SympathyDimension.OVERALL


@router.post("/vote", response_model=SympathyVoteRead)
async def cast_sympathy_vote(
    payload: SympathyVoteCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> SympathyVote:
    if payload.value not in (-1, 1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="value must be -1 or 1")
    team = await db.get(Team, payload.team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    q = await db.execute(
        select(SympathyVote).where(
            SympathyVote.user_id == current_user.id,
            SympathyVote.team_id == payload.team_id,
            SympathyVote.dimension == _DIM,
        )
    )
    row = q.scalar_one_or_none()
    if row:
        row.value = payload.value
    else:
        row = SympathyVote(
            user_id=current_user.id,
            team_id=payload.team_id,
            dimension=_DIM,
            value=payload.value,
        )
        db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.get("/team/{team_id}/total", response_model=SympathyTeamTotal)
async def sympathy_team_total(team_id: int, db: AsyncSession = Depends(get_async_db)) -> SympathyTeamTotal:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    stmt = select(func.coalesce(func.sum(SympathyVote.value), 0)).where(
        SympathyVote.team_id == team_id,
        SympathyVote.dimension == _DIM,
    )
    total = int((await db.execute(stmt)).scalar_one() or 0)
    return SympathyTeamTotal(team_id=team_id, total=total)


@router.get("/leaderboard", response_model=SympathyLeaderboardResponse)
async def sympathy_leaderboard(db: AsyncSession = Depends(get_async_db)) -> SympathyLeaderboardResponse:
    join_on = and_(Team.id == SympathyVote.team_id, SympathyVote.dimension == _DIM)
    stmt = (
        select(Team.id, Team.name, func.coalesce(func.sum(SympathyVote.value), 0))
        .select_from(Team)
        .outerjoin(SympathyVote, join_on)
        .group_by(Team.id, Team.name)
        .order_by(func.coalesce(func.sum(SympathyVote.value), 0).desc(), Team.name.asc())
    )
    result = await db.execute(stmt)
    rows = [
        SympathyLeaderboardRow(team_id=int(tid), team_name=str(name), score=int(total or 0))
        for tid, name, total in result.all()
    ]
    return SympathyLeaderboardResponse(rows=rows)


@router.get("/me", response_model=List[SympathyVoteRead])
async def my_sympathy_votes(
    team_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> List[SympathyVote]:
    q = select(SympathyVote).where(
        SympathyVote.user_id == current_user.id,
        SympathyVote.dimension == _DIM,
    )
    if team_id is not None:
        q = q.where(SympathyVote.team_id == team_id)
    q = q.order_by(SympathyVote.team_id)
    res = await db.execute(q)
    return list(res.scalars().all())
