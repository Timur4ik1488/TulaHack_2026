from collections import defaultdict
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import assert_team_participant_or_jury, get_current_user, is_user_expert
from app.core.socket import sio
from app.db.db import get_async_db
from app.models.criterion import Criterion
from app.models.score import Score
from app.models.project_case import ProjectCase, ProjectCaseTeam
from app.models.team import Team
from app.models.user import User
from app.schemas.score import (
    ExpertScoreSheetRead,
    ScoreCreate,
    TeamRatingRead,
    TeamScoreBreakdownRead,
    TeamScoreCriterionBreakdown,
    TeamScoreCriterionExpertLine,
)
from app.core.config import settings
from app.scoring import _sympathy_bonus_percent_for_vote_sum, _sympathy_sum_by_team, leaderboard_totals, team_total_percent
from app.services.jury_pack import build_jury_zip_bytes

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
        co = row.get("case_ordinal")
        cid = row.get("case_id")
        ctitle = row.get("case_title")
        out.append(
            TeamRatingRead(
                rank=rank,
                team_id=row["team_id"],
                team_name=row["team_name"],
                case_ordinal=int(co) if co is not None else None,
                case_id=int(cid) if cid is not None else None,
                case_title=str(ctitle).strip() if ctitle is not None and str(ctitle).strip() else None,
                jury_percent=float(row["jury_percent"]),
                sympathy_bonus_percent=float(row.get("sympathy_bonus_percent", 0.0)),
                sympathy_votes_sum=int(row.get("sympathy_votes_sum", 0)),
                total_percent=pct,
            )
        )
    return out


async def _attach_case_info(db: AsyncSession, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Для лидерборда: ordinal, id и название кейса (назначение или подбор по teams.case_number)."""
    ids = [int(r["team_id"]) for r in rows]
    if not ids:
        return rows
    stmt = (
        select(Team)
        .where(Team.id.in_(ids))
        .options(selectinload(Team.case_assignment).selectinload(ProjectCaseTeam.case))
    )
    by_id = {t.id: t for t in (await db.execute(stmt)).scalars().all()}

    need_ordinals: set[int] = set()
    resolved: dict[int, tuple[int | None, int | None, str | None]] = {}

    for tid in ids:
        t = by_id.get(tid)
        if not t:
            resolved[tid] = (None, None, None)
            continue
        if t.case_assignment and t.case_assignment.case:
            c = t.case_assignment.case
            resolved[tid] = (c.id, c.ordinal, c.title)
        elif t.case_number is not None:
            need_ordinals.add(int(t.case_number))
        else:
            resolved[tid] = (None, None, None)

    ord_to_case: dict[int, ProjectCase] = {}
    if need_ordinals:
        q = await db.execute(select(ProjectCase).where(ProjectCase.ordinal.in_(need_ordinals)))
        ord_to_case = {c.ordinal: c for c in q.scalars().all()}

    for tid in ids:
        if tid in resolved:
            continue
        t = by_id.get(tid)
        if t and t.case_number is not None:
            oc = int(t.case_number)
            c = ord_to_case.get(oc)
            if c:
                resolved[tid] = (c.id, c.ordinal, c.title)
            else:
                resolved[tid] = (None, oc, None)

    for r in rows:
        tid = int(r["team_id"])
        cid, co, title = resolved.get(tid, (None, None, None))
        r["case_id"] = cid
        r["case_ordinal"] = co
        r["case_title"] = title
    return rows


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

    q = await db.execute(
        select(Score).where(
            Score.expert_id == current_user.id,
            Score.team_id == payload.team_id,
            Score.criterion_id == payload.criterion_id,
        )
    )
    row = q.scalar_one_or_none()
    unset = payload.model_dump(exclude_unset=True)
    new_comment: str | None = None
    if "jury_comment" in unset:
        jc = unset.get("jury_comment")
        if jc is None or (isinstance(jc, str) and not str(jc).strip()):
            new_comment = None
        else:
            new_comment = str(jc).strip()[:500]

    if row:
        row.value = payload.value
        row.is_final = True
        if "jury_comment" in unset:
            row.jury_comment = new_comment
    else:
        db.add(
            Score(
                expert_id=current_user.id,
                team_id=payload.team_id,
                criterion_id=payload.criterion_id,
                value=payload.value,
                is_final=True,
                jury_comment=new_comment if "jury_comment" in unset else None,
            )
        )
    await db.commit()

    pct = await team_total_percent(db, payload.team_id)
    await sio.emit(
        "rating_updated",
        {"team_id": payload.team_id, "total_percent": pct, "score": pct},
    )
    return {"ok": True, "total_percent": pct}


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
    rows = await _attach_case_info(db, rows)
    return _rank_rows(rows)


@router.get("/podium", response_model=List[TeamRatingRead])
async def get_podium(
    limit: int = Query(default=3, ge=1, le=50),
    db: AsyncSession = Depends(get_async_db),
) -> List[TeamRatingRead]:
    rows = await leaderboard_totals(db)
    rows = await _attach_case_info(db, rows)
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

    expert_stmt = (
        select(Score.criterion_id, User.username, Score.value, Score.jury_comment)
        .join(User, User.id == Score.expert_id)
        .where(Score.team_id == team_id, Score.is_final.is_(True))
        .order_by(Score.criterion_id, User.username)
    )
    expert_rows = (await db.execute(expert_stmt)).all()
    by_criterion: dict[int, list[TeamScoreCriterionExpertLine]] = defaultdict(list)
    for cid, uname, val, jcom in expert_rows:
        cmt = (str(jcom).strip() if jcom is not None else "") or None
        by_criterion[int(cid)].append(
            TeamScoreCriterionExpertLine(
                expert_username=str(uname),
                value=round(float(val), 2),
                comment=cmt,
            )
        )

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
                expert_lines=by_criterion.get(int(cid), []),
            )
        )

    jury = round(total, 2)
    sym_by_team = await _sympathy_sum_by_team(db)
    sym_sum = float(sym_by_team.get(team_id, 0.0))
    sym_bonus = _sympathy_bonus_percent_for_vote_sum(sym_sum)
    sym_votes = int(round(sym_sum))
    lb_total = round(max(0.0, min(100.0, jury + sym_bonus)), 2)
    sym_cap = max(float(settings.SYMPATHY_LEADERBOARD_WEIGHT), abs(sym_bonus), 0.01)

    return TeamScoreBreakdownRead(
        team_id=team.id,
        team_name=team.name,
        total_percent=jury,
        sympathy_bonus_percent=sym_bonus,
        sympathy_votes_sum=sym_votes,
        sympathy_cap_percent=sym_cap,
        leaderboard_total_percent=lb_total,
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
            Score.jury_comment,
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
            jury_comment=(str(r[6]).strip() if r[6] is not None else None) or None,
        )
        for r in result.all()
    ]


@router.get("/jury-pack.zip")
async def download_jury_pack_zip(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(is_user_expert),
) -> StreamingResponse:
    body, filename = await build_jury_zip_bytes(db)
    return StreamingResponse(
        iter([body]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
