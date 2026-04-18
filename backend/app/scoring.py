"""Расчёт итогов: жюри по весам критериев + зрительские симпатии (линейно: SYMPATHY_PERCENT_PER_VOTE на единицу суммы голосов)."""

from typing import Any, Dict, List

from sqlalchemy import Select, case, cast, func, select, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.criterion import Criterion
from app.models.score import Score
from app.models.sympathy_vote import SympathyDimension, SympathyVote
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


async def jury_team_total_percent(session: AsyncSession, team_id: int) -> float:
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


def _sympathy_overall_clause():
    """Только overall: одно устойчивое сравнение по строке в БД (без лишних OR в CASE)."""
    dim_s = cast(SympathyVote.dimension, String)
    return func.lower(func.trim(dim_s)) == SympathyDimension.OVERALL.value


async def _sympathy_sum_by_team(session: AsyncSession) -> Dict[int, float]:
    cond = _sympathy_overall_clause()
    stmt = (
        select(
            Team.id,
            func.coalesce(
                func.sum(case((cond, SympathyVote.value), else_=0)),
                0.0,
            ),
        )
        .select_from(Team)
        .outerjoin(SympathyVote, Team.id == SympathyVote.team_id)
        .group_by(Team.id)
    )
    result = await session.execute(stmt)
    return {int(tid): float(total or 0.0) for tid, total in result.all()}


def _sympathy_bonus_percent_for_vote_sum(vote_sum: float) -> float:
    """Бонус в п.п.: сумма голосов (+1/−1) × SYMPATHY_PERCENT_PER_VOTE."""
    return round(float(vote_sum) * float(settings.SYMPATHY_PERCENT_PER_VOTE), 4)


async def team_total_percent(session: AsyncSession, team_id: int) -> float:
    """Итог в % для лидерборда: жюри + бонус симпатий (макс. 100, мин. 0)."""
    jury = await jury_team_total_percent(session, team_id)
    sym_all = await _sympathy_sum_by_team(session)
    bonus = _sympathy_bonus_percent_for_vote_sum(sym_all.get(team_id, 0.0))
    return round(max(0.0, min(100.0, jury + bonus)), 2)


async def leaderboard_totals(session: AsyncSession) -> List[Dict[str, Any]]:
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
            score_expr.label("jury_percent"),
        )
        .select_from(Team)
        .outerjoin(sc, sc.c.team_id == Team.id)
        .outerjoin(Criterion, Criterion.id == sc.c.criterion_id)
        .group_by(Team.id, Team.name)
        .order_by(Team.id)
    )
    result = await session.execute(query)
    rows: List[Dict[str, Any]] = [dict(row._mapping) for row in result]
    for r in rows:
        r["jury_percent"] = round(float(r["jury_percent"]), 2)

    sym = await _sympathy_sum_by_team(session)

    for r in rows:
        tid = int(r["team_id"])
        s = float(sym.get(tid, 0.0))
        raw = int(round(s))
        r["sympathy_votes_sum"] = raw
        b = _sympathy_bonus_percent_for_vote_sum(s)
        r["sympathy_bonus_percent"] = b
        r["total_percent"] = round(max(0.0, min(100.0, float(r["jury_percent"]) + b)), 2)

    rows.sort(key=lambda x: (-x["total_percent"], x["team_name"]))
    return rows


async def criteria_weights_total(session: AsyncSession) -> float:
    r = await session.execute(select(func.coalesce(func.sum(Criterion.weight), 0.0)))
    return float(r.scalar_one())
