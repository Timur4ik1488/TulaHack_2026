from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_team_participant_or_jury, get_current_user, is_user_expert
from app.core.socket import sio
from app.db.db import get_async_db
from app.models.criterion import Criterion
from app.models.score import Score
from app.models.team import Team
from app.models.user import User
from app.schemas.score import (
    ExpertScoreSheetRead,
    ScoreCreate,
    TeamRatingRead,
    TeamScoreBreakdownRead,
    TeamScoreCriterionBreakdown,
)
from app.scoring import leaderboard_totals, team_total_percent

router = APIRouter(tags=["scores"])


def _rank_rows(rows: List[Dict[str, Any]]) -> List[TeamRatingRead]:
    out: List[TeamRatingRead] = []
    rank = 0
    prev: Optional[float] = None
    for i, row in enumerate(rows):
        pct = row["total_percent"]
        if prev is None or pct != prev:
            rank = i + 1
        prev = pct
        out.append(
            TeamRatingRead(
                rank=rank,
                team_id=row["team_id"],
                team_name=row["team_name"],
                total_percent=pct,
            )
        )
    return out


@router.post("/")
async def upsert_score(
    payload: ScoreCreate,
    current_user: User = Depends(is_user_expert),
    db: AsyncSession = Depends(get_async_db),
) -> Dict[str, Any]:
    cr = await db.get(Criterion, payload.criterion_id)
    if not cr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criterion not found")
    if cr.max_score <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Criterion max_score must be positive",
        )
    if payload.value < 0 or payload.value > cr.max_score:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Score must be between 0 and {cr.max_score}",
        )

    # Универсальный upsert (SQLite не всегда корректно обрабатывает insert.on_conflict).
    q = await db.execute(
        select(Score).where(
            Score.expert_id == current_user.id,
            Score.team_id == payload.team_id,
            Score.criterion_id == payload.criterion_id,
        )
    )
    row = q.scalar_one_or_none()
    if row:
        row.value = payload.value
        row.is_final = False
    else:
        db.add(
            Score(
                expert_id=current_user.id,
                team_id=payload.team_id,
                criterion_id=payload.criterion_id,
                value=payload.value,
                is_final=False,
            )
        )
    await db.commit()
    return {"ok": True}


@router.post("/{team_id}/submit")
async def submit_scores(
    team_id: int,
    current_user: User = Depends(is_user_expert),
    db: AsyncSession = Depends(get_async_db),
) -> Dict[str, Any]:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    await db.execute(
        update(Score)
        .where(Score.expert_id == current_user.id, Score.team_id == team_id)
        .values(is_final=True)
    )
    await db.commit()

    pct = await team_total_percent(db, team_id)
    await sio.emit(
        "rating_updated",
        {"team_id": team_id, "total_percent": pct, "score": pct},
    )
    return {"ok": True, "total_percent": pct}


@router.get("/rating", response_model=List[TeamRatingRead])
@router.get("/leaderboard", response_model=List[TeamRatingRead])
async def get_rating(db: AsyncSession = Depends(get_async_db)) -> List[TeamRatingRead]:
    """Публично: таблица результатов для гостей и всех."""
    rows = await leaderboard_totals(db)
    return _rank_rows(rows)


@router.get("/podium", response_model=List[TeamRatingRead])
async def get_podium(
    limit: int = Query(default=3, ge=1, le=50),
    db: AsyncSession = Depends(get_async_db),
) -> List[TeamRatingRead]:
    rows = await leaderboard_totals(db)
    ranked = _rank_rows(rows)
    return ranked[:limit]


@router.get("/team/{team_id}/breakdown", response_model=TeamScoreBreakdownRead)
async def team_score_breakdown(
    team_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> TeamScoreBreakdownRead:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    await assert_team_participant_or_jury(db, current_user, team_id)

    stmt = (
        select(
            Criterion.id,
            Criterion.name,
            Criterion.weight,
            Criterion.max_score,
            func.avg(Score.value).label("avg_v"),
        )
        .join(Score, Score.criterion_id == Criterion.id)
        .where(Score.team_id == team_id, Score.is_final.is_(True))
        .group_by(Criterion.id, Criterion.name, Criterion.weight, Criterion.max_score)
        .order_by(Criterion.id)
    )
    result = await db.execute(stmt)
    criteria: List[TeamScoreCriterionBreakdown] = []
    total = 0.0
    for row in result:
        cid, name, weight, max_s, avg_v = row
        max_s = float(max_s) or 1e-9
        avg_f = float(avg_v or 0.0)
        fill = round((avg_f / max_s) * 100.0, 2)
        contrib = round((avg_f / max_s) * float(weight), 2)
        total += (avg_f / max_s) * float(weight)
        criteria.append(
            TeamScoreCriterionBreakdown(
                criterion_id=int(cid),
                criterion_name=str(name),
                weight_percent=float(weight),
                max_score=float(max_s),
                avg_expert_score=round(avg_f, 2),
                criterion_fill_percent=fill,
                weighted_contribution_percent=contrib,
            )
        )

    return TeamScoreBreakdownRead(
        team_id=team.id,
        team_name=team.name,
        total_percent=round(total, 2),
        criteria=criteria,
    )


@router.get("/mine", response_model=List[ExpertScoreSheetRead])
async def my_scores(
    team_id: Optional[int] = Query(default=None, description="Фильтр по команде"),
    current_user: User = Depends(is_user_expert),
    db: AsyncSession = Depends(get_async_db),
) -> List[ExpertScoreSheetRead]:
    q = (
        select(
            Score.team_id,
            Score.criterion_id,
            Criterion.name,
            Criterion.max_score,
            Score.value,
            Score.is_final,
        )
        .join(Criterion, Criterion.id == Score.criterion_id)
        .where(Score.expert_id == current_user.id)
        .order_by(Score.team_id, Score.criterion_id)
    )
    if team_id is not None:
        q = q.where(Score.team_id == team_id)
    result = await db.execute(q)
    return [
        ExpertScoreSheetRead(
            team_id=r[0],
            criterion_id=r[1],
            criterion_name=r[2],
            max_score=float(r[3]),
            value=float(r[4]),
            is_final=bool(r[5]),
        )
        for r in result.all()
    ]
