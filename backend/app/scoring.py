"""Расчёт итогов: веса критериев в % (сумма 100), балл по критерию 0..max_score.

Итог команды в процентах от максимума (0–100):
  sum по критериям: (среднее значение экспертов / max_score) * weight

Если по критерию ещё нет финальных оценок, критерий не входит в сумму.
"""

from typing import Any, Dict, List

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.criterion import Criterion
from app.models.score import Score
from app.models.team import Team


def _avg_scores_subquery():
    return (
        select(
            Score.team_id,
            Score.criterion_id,
            func.avg(Score.value).label("avg_value"),
        )
        .where(Score.is_final.is_(True))
        .group_by(Score.team_id, Score.criterion_id)
    ).subquery()


async def team_total_percent(session: AsyncSession, team_id: int) -> float:
    sc = _avg_scores_subquery()
    expr = func.coalesce(
        func.sum(
            (sc.c.avg_value / func.nullif(Criterion.max_score, 0.0)) * Criterion.weight
        ),
        0.0,
    )
    q = (
        select(expr)
        .select_from(sc)
        .join(Criterion, Criterion.id == sc.c.criterion_id)
        .where(sc.c.team_id == team_id)
    )
    row = (await session.execute(q)).scalar_one()
    return round(float(row or 0.0), 2)


async def leaderboard_totals(session: AsyncSession) -> List[Dict[str, Any]]:
    """Список команд с total_percent, отсортированный по убыванию балла."""
    sc = _avg_scores_subquery()
    score_expr = func.coalesce(
        func.sum(
            (sc.c.avg_value / func.nullif(Criterion.max_score, 0.0)) * Criterion.weight
        ),
        0.0,
    )
    query: Select = (
        select(
            Team.id.label("team_id"),
            Team.name.label("team_name"),
            score_expr.label("total_percent"),
        )
        .select_from(Team)
        .outerjoin(sc, sc.c.team_id == Team.id)
        .outerjoin(Criterion, Criterion.id == sc.c.criterion_id)
        .group_by(Team.id, Team.name)
        .order_by(score_expr.desc(), Team.id)
    )
    result = await session.execute(query)
    rows: List[Dict[str, Any]] = [dict(row._mapping) for row in result]
    for r in rows:
        r["total_percent"] = round(float(r["total_percent"]), 2)
    return rows


async def criteria_weights_total(session: AsyncSession) -> float:
    r = await session.execute(select(func.coalesce(func.sum(Criterion.weight), 0.0)))
    return float(r.scalar_one())
