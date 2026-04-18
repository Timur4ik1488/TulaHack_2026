import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
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
log = logging.getLogger(__name__)

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

    # UPSERT: одна строка на (user, team, dimension). Иначе при дубликатах в БД
    # сумма в лидерборде считает все строки, а SELECT scalar_one_or_none обновлял только одну — шаг на 2.
    tbl = SympathyVote.__table__
    ins = pg_insert(tbl).values(
        user_id=current_user.id,
        team_id=payload.team_id,
        dimension=_DIM.value,
        value=payload.value,
    )
    stmt = ins.on_conflict_do_update(
        constraint="uq_sympathy_user_team_dim",
        set_={"value": payload.value},
    ).returning(tbl.c.team_id, tbl.c.dimension, tbl.c.value)
    row = (await db.execute(stmt)).one()
    await db.commit()
    dim_raw = row.dimension
    if isinstance(dim_raw, SympathyDimension):
        dim = dim_raw
    else:
        dim = SympathyDimension(str(dim_raw).strip().lower())
    # Снимаем значения в DTO до expire_all — иначе ORM «протухает» и сериализация ответа даёт MissingGreenlet.
    response = SympathyVoteRead(
        team_id=int(row.team_id),
        dimension=dim,
        value=int(row.value),
    )
    db.expire_all()
    try:
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
    except Exception:
        log.exception("sympathy vote: leaderboard/socket emit failed (vote still saved)")
    return response


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
) -> List[SympathyVoteRead]:
    q = select(SympathyVote).where(
        SympathyVote.user_id == current_user.id,
        _sympathy_overall_clause(),
    )
    if team_id is not None:
        q = q.where(SympathyVote.team_id == team_id)
    q = q.order_by(SympathyVote.team_id)
    res = await db.execute(q)
    votes = list(res.scalars().all())
    # На случай старых дубликатов в БД: для каждой команды берём голос с максимальным id.
    by_team: dict[int, SympathyVote] = {}
    for v in votes:
        prev = by_team.get(v.team_id)
        if prev is None or v.id > prev.id:
            by_team[v.team_id] = v
    ordered = sorted(by_team.values(), key=lambda x: x.team_id)
    return [
        SympathyVoteRead(team_id=v.team_id, dimension=v.dimension, value=int(v.value)) for v in ordered
    ]
