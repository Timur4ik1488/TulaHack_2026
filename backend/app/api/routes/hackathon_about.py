from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import is_user_admin
from app.db.db import get_async_db
from app.models.hackathon_overview import HackathonOverview
from app.models.project_case import ProjectCase
from app.models.user import User, UserRole
from app.schemas.case import CaseRead
from app.schemas.hackathon_about import HackathonAboutIntroPatch, HackathonAboutPublic, StaffPublicBrief

router = APIRouter(tags=["hackathon"])

_OVERVIEW_ID = 1


async def _get_or_create_overview(db: AsyncSession) -> HackathonOverview:
    row = await db.get(HackathonOverview, _OVERVIEW_ID)
    if row is None:
        row = HackathonOverview(id=_OVERVIEW_ID, intro="")
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


def _staff_brief(u: User) -> StaffPublicBrief:
    return StaffPublicBrief(
        user_id=u.id,
        username=u.username,
        avatar_url=u.avatar_url,
    )


@router.get("/about", response_model=HackathonAboutPublic)
async def get_hackathon_about(db: AsyncSession = Depends(get_async_db)) -> HackathonAboutPublic:
    ov = await _get_or_create_overview(db)
    exp = (
        await db.execute(
            select(User)
            .where(
                User.role == UserRole.EXPERT,
                User.is_active.is_(True),
                User.is_blocked.is_(False),
            )
            .order_by(User.username.asc())
        )
    ).scalars().all()
    adm = (
        await db.execute(
            select(User)
            .where(
                User.role == UserRole.ADMIN,
                User.is_active.is_(True),
                User.is_blocked.is_(False),
            )
            .order_by(User.username.asc())
        )
    ).scalars().all()
    cases_rows = (await db.execute(select(ProjectCase).order_by(ProjectCase.ordinal.asc()))).scalars().all()
    cases = [CaseRead.model_validate(c) for c in cases_rows]
    return HackathonAboutPublic(
        intro=ov.intro or "",
        updated_at=ov.updated_at,
        experts=[_staff_brief(u) for u in exp],
        admins=[_staff_brief(u) for u in adm],
        cases=cases,
    )


@router.patch("/about", response_model=HackathonAboutPublic, dependencies=[Depends(is_user_admin)])
async def patch_hackathon_about(
    payload: HackathonAboutIntroPatch,
    db: AsyncSession = Depends(get_async_db),
) -> HackathonAboutPublic:
    ov = await _get_or_create_overview(db)
    ov.intro = payload.intro or ""
    ov.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(ov)
    return await get_hackathon_about(db)
