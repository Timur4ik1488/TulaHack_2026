from fastapi import APIRouter, Depends
from sqlalchemy import Select, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, is_user_expert
from app.core.socket import sio
from app.db.db import get_async_db
from app.models.criterion import Criterion
from app.models.score import Score
from app.models.team import Team
from app.models.user import User
from app.schemas.score import ScoreCreate, TeamRatingRead

router = APIRouter(tags=["scores"])


async def calculate_team_score(team_id: int, db: AsyncSession) -> float:
    result = await db.execute(
        select(Score, Criterion)
        .join(Criterion, Score.criterion_id == Criterion.id)
        .where(Score.team_id == team_id, Score.is_final.is_(True))
    )
    rows = result.all()

    total = 0.0
    for score, criterion in rows:
        total += (score.value / criterion.max_score) * criterion.weight
    return round(total, 2)


@router.post("/", dependencies=[Depends(is_user_expert)])
async def upsert_score(
    payload: ScoreCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    stmt = insert(Score).values(
        expert_id=current_user.id,
        team_id=payload.team_id,
        criterion_id=payload.criterion_id,
        value=payload.value,
        is_final=False,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["expert_id", "team_id", "criterion_id"],
        set_={"value": payload.value, "is_final": False},
    )
    await db.execute(stmt)
    await db.commit()
    return {"ok": True}


@router.post("/{team_id}/submit", dependencies=[Depends(is_user_expert)])
async def submit_scores(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    await db.execute(
        update(Score)
        .where(Score.expert_id == current_user.id, Score.team_id == team_id)
        .values(is_final=True)
    )
    await db.commit()

    new_score = await calculate_team_score(team_id, db)
    await sio.emit("rating_updated", {"team_id": team_id, "score": new_score})
    return {"ok": True, "score": new_score}


@router.get("/rating", response_model=list[TeamRatingRead])
async def get_rating(db: AsyncSession = Depends(get_async_db)) -> list[TeamRatingRead]:
    score_expr = func.sum((Score.value / Criterion.max_score) * Criterion.weight)
    query: Select = (
        select(
            Team.id.label("team_id"),
            Team.name.label("team_name"),
            func.coalesce(score_expr, 0).label("total_score"),
        )
        .outerjoin(Score, (Score.team_id == Team.id) & Score.is_final.is_(True))
        .outerjoin(Criterion, Criterion.id == Score.criterion_id)
        .group_by(Team.id, Team.name)
        .order_by(func.coalesce(score_expr, 0).desc(), Team.id)
    )
    result = await db.execute(query)
    return [TeamRatingRead.model_validate(row._mapping) for row in result]
