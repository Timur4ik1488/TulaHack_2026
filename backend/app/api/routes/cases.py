import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, is_user_admin
from app.db.db import get_async_db
from app.models.project_case import ProjectCase, ProjectCaseExpert, ProjectCaseTeam
from app.models.team import Team
from app.models.user import User, UserRole
from app.schemas.case import (
    CaseCreate,
    CaseDetailRead,
    CaseExpertIds,
    CaseRead,
    CaseTeamAssign,
    CaseTeamBrief,
    CaseUpdate,
)

router = APIRouter(tags=["cases"])


async def _load_case(db: AsyncSession, case_id: int) -> ProjectCase | None:
    stmt = (
        select(ProjectCase)
        .where(ProjectCase.id == case_id)
        .options(
            selectinload(ProjectCase.experts),
            selectinload(ProjectCase.teams).selectinload(ProjectCaseTeam.team),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def _assert_expert_on_case(db: AsyncSession, user_id: uuid.UUID, case_id: int) -> None:
    r = await db.execute(
        select(ProjectCaseExpert).where(
            ProjectCaseExpert.case_id == case_id,
            ProjectCaseExpert.user_id == user_id,
        )
    )
    if r.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Эксперт не закреплён за этим кейсом",
        )


def _detail_from_case(c: ProjectCase) -> CaseDetailRead:
    experts = [e.user_id for e in (c.experts or [])]
    teams = [
        CaseTeamBrief(team_id=t.team_id, team_name=t.team.name if t.team else "")
        for t in (c.teams or [])
        if t.team is not None
    ]
    return CaseDetailRead(
        id=c.id,
        ordinal=c.ordinal,
        title=c.title,
        description=c.description,
        company_name=c.company_name,
        created_at=c.created_at,
        expert_user_ids=experts,
        teams=teams,
    )


@router.get("/", response_model=List[CaseRead])
async def list_cases(db: AsyncSession = Depends(get_async_db)) -> List[ProjectCase]:
    r = await db.execute(select(ProjectCase).order_by(ProjectCase.ordinal.asc()))
    return list(r.scalars().all())


@router.get("/{case_id}", response_model=CaseDetailRead)
async def get_case(case_id: int, db: AsyncSession = Depends(get_async_db)) -> CaseDetailRead:
    c = await _load_case(db, case_id)
    if not c:
        raise HTTPException(status_code=404, detail="Кейс не найден")
    return _detail_from_case(c)


@router.post("/", response_model=CaseRead, dependencies=[Depends(is_user_admin)])
async def create_case(
    payload: CaseCreate,
    db: AsyncSession = Depends(get_async_db),
) -> ProjectCase:
    mx = await db.execute(select(func.coalesce(func.max(ProjectCase.ordinal), 0)))
    nxt = int(mx.scalar_one() or 0) + 1
    row = ProjectCase(
        ordinal=nxt,
        title=payload.title,
        description=payload.description,
        company_name=payload.company_name,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/{case_id}", response_model=CaseRead, dependencies=[Depends(is_user_admin)])
async def update_case(
    case_id: int,
    payload: CaseUpdate,
    db: AsyncSession = Depends(get_async_db),
) -> ProjectCase:
    c = await db.get(ProjectCase, case_id)
    if not c:
        raise HTTPException(status_code=404, detail="Кейс не найден")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    return c


@router.post("/{case_id}/experts", response_model=CaseDetailRead, dependencies=[Depends(is_user_admin)])
async def set_case_experts(
    case_id: int,
    payload: CaseExpertIds,
    db: AsyncSession = Depends(get_async_db),
) -> CaseDetailRead:
    c = await _load_case(db, case_id)
    if not c:
        raise HTTPException(status_code=404, detail="Кейс не найден")
    for uid in payload.user_ids:
        u = await db.get(User, uid)
        if not u or u.role != UserRole.EXPERT:
            raise HTTPException(status_code=400, detail=f"Пользователь {uid} не эксперт")
    await db.execute(delete(ProjectCaseExpert).where(ProjectCaseExpert.case_id == case_id))
    for uid in payload.user_ids:
        db.add(ProjectCaseExpert(case_id=case_id, user_id=uid))
    await db.commit()
    c2 = await _load_case(db, case_id)
    assert c2
    return _detail_from_case(c2)


@router.post("/{case_id}/teams", response_model=CaseDetailRead)
async def assign_team_to_case(
    case_id: int,
    payload: CaseTeamAssign,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> CaseDetailRead:
    c = await db.get(ProjectCase, case_id)
    if not c:
        raise HTTPException(status_code=404, detail="Кейс не найден")
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.EXPERT:
        await _assert_expert_on_case(db, current_user.id, case_id)
    else:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    team = await db.get(Team, payload.team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")

    existing = await db.execute(select(ProjectCaseTeam).where(ProjectCaseTeam.team_id == payload.team_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Команда уже закреплена за кейсом")

    db.add(ProjectCaseTeam(case_id=case_id, team_id=payload.team_id))
    await db.commit()
    c2 = await _load_case(db, case_id)
    assert c2
    return _detail_from_case(c2)


@router.delete("/{case_id}/teams/{team_id}", response_model=CaseDetailRead)
async def remove_team_from_case(
    case_id: int,
    team_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> CaseDetailRead:
    c = await db.get(ProjectCase, case_id)
    if not c:
        raise HTTPException(status_code=404, detail="Кейс не найден")
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.EXPERT:
        await _assert_expert_on_case(db, current_user.id, case_id)
    else:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    await db.execute(
        delete(ProjectCaseTeam).where(
            ProjectCaseTeam.case_id == case_id,
            ProjectCaseTeam.team_id == team_id,
        )
    )
    await db.commit()
    c2 = await _load_case(db, case_id)
    assert c2
    return _detail_from_case(c2)
