from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.socket import sio
from app.db.db import get_async_db
from app.models.sympathy_vote import SympathyDimension, SympathyVote
from app.models.team import Team
from app.models.user import User
from app.scoring import _sympathy_overall_clause, leaderboard_totals
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
) -> SympathyVoteRead:
    if payload.value not in (-1, 1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="value must be -1 or 1")
    team = await db.get(Team, payload.team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    q = await db.execute(
        select(SympathyVote).where(
            SympathyVote.user_id == current_user.id,
            SympathyVote.team_id == payload.team_id,
            _sympathy_overall_clause(),
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
    # Сериализуем до expire_all: иначе ORM-атрибуты тянут lazy-IO вне greenlet (ResponseValidationError).
    out = SympathyVoteRead(team_id=row.team_id, dimension=row.dimension, value=row.value)
    db.expire_all()
    rows = await leaderboard_totals(db)
    for r in rows:
        if int(r["team_id"]) == payload.team_id:
            await sio.emit(
                "rating_updated",
                {
                    "team_id": payload.team_id,
                    "total_percent": r["total_percent"],
                    "sympathy": True,
                },
            )
            break
    else:
        await sio.emit("rating_updated", {"team_id": payload.team_id, "sympathy": True})
    return out


@router.get("/team/{team_id}/total", response_model=SympathyTeamTotal)
async def sympathy_team_total(team_id: int, db: AsyncSession = Depends(get_async_db)) -> SympathyTeamTotal:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    cond = _sympathy_overall_clause()
    stmt = select(func.coalesce(func.sum(case((cond, SympathyVote.value), else_=0)), 0)).where(
        SympathyVote.team_id == team_id,
    )
    total = int((await db.execute(stmt)).scalar_one() or 0)
    return SympathyTeamTotal(team_id=team_id, total=total)


@router.get("/leaderboard", response_model=SympathyLeaderboardResponse)
async def sympathy_leaderboard(db: AsyncSession = Depends(get_async_db)) -> SympathyLeaderboardResponse:
    cond = _sympathy_overall_clause()
    sym_sum = func.coalesce(func.sum(case((cond, SympathyVote.value), else_=0)), 0).label("sym_sum")
    agg = (
        select(Team.id.label("tid"), Team.name.label("tname"), sym_sum)
        .select_from(Team)
        .outerjoin(SympathyVote, Team.id == SympathyVote.team_id)
        .group_by(Team.id, Team.name)
        .subquery()
    )
    stmt = select(agg.c.tid, agg.c.tname, agg.c.sym_sum).order_by(agg.c.sym_sum.desc(), agg.c.tname.asc())
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
        _sympathy_overall_clause(),
    )
    if team_id is not None:
        q = q.where(SympathyVote.team_id == team_id)
    q = q.order_by(SympathyVote.team_id)
    res = await db.execute(q)
    return list(res.scalars().all())
