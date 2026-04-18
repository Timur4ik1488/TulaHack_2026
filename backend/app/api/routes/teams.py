import json
import re
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    assert_team_participant_or_jury,
    get_current_user,
    is_user_admin,
)
from app.core.config import settings
from app.core.timer_helpers import submission_window_open
from app.core.team_invite import generate_unique_invite_code
from app.db.db import get_async_db
from app.models.message import Message
from app.models.project_case import ProjectCase, ProjectCaseTeam
from app.models.score import Score
from app.models.team import Team
from app.models.team_member import TeamMember, TeamMemberRole
from app.models.user import User, UserRole
from app.schemas.team import (
    JoinByInviteIn,
    MyTeamSummary,
    TeamBriefUpdate,
    TeamCreate,
    TeamCaseCardBrief,
    TeamMemberOut,
    TeamMemberPublicOut,
    TeamPublicCardRead,
    TeamPublicRead,
    TeamRead,
    TeamUpdate,
)

router = APIRouter(tags=["teams"])

ALLOWED_PHOTO_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_PHOTO_BYTES = 2 * 1024 * 1024


def _case_ordinal_for_team(team: Team, case_lookup: dict[int, ProjectCase]) -> int | None:
    if team.case_assignment and team.case_assignment.case:
        return team.case_assignment.case.ordinal
    if team.case_number is not None:
        oc = case_lookup.get(team.case_number)
        if oc:
            return oc.ordinal
    return None


def _case_brief_from_model(c: ProjectCase) -> TeamCaseCardBrief:
    d = c.description
    if d and len(d) > 280:
        d = d[:277] + "..."
    return TeamCaseCardBrief(
        case_id=c.id,
        ordinal=c.ordinal,
        title=c.title,
        company_name=c.company_name,
        description=d,
    )


def _team_public_card(team: Team, cases_by_ordinal: dict[int, ProjectCase]) -> TeamPublicCardRead:
    base = TeamPublicRead.model_validate(team)
    members_sorted = sorted(
        team.team_members or [],
        key=lambda m: (0 if m.role == TeamMemberRole.CAPTAIN else 1, m.id),
    )
    members_out = [
        TeamMemberPublicOut(username=m.user.username, role=m.role.value)
        for m in members_sorted
        if m.user is not None
    ]
    case_card: TeamCaseCardBrief | None = None
    if team.case_assignment and team.case_assignment.case:
        case_card = _case_brief_from_model(team.case_assignment.case)
    elif team.case_number is not None:
        oc = cases_by_ordinal.get(team.case_number)
        if oc:
            case_card = _case_brief_from_model(oc)
    return TeamPublicCardRead(
        **base.model_dump(),
        case_ordinal=_case_ordinal_for_team(team, cases_by_ordinal),
        members=members_out,
        case_card=case_card,
    )


async def _cases_by_ordinal_for_teams(db: AsyncSession, teams: List[Team]) -> dict[int, ProjectCase]:
    """Ключ — и ordinal, и id кейса: в teams.case_number могли сохранять любое из двух."""
    need: set[int] = set()
    for t in teams:
        if (not t.case_assignment or not t.case_assignment.case) and t.case_number is not None:
            need.add(t.case_number)
    if not need:
        return {}
    res = await db.execute(select(ProjectCase).where(or_(ProjectCase.ordinal.in_(need), ProjectCase.id.in_(need))))
    merged: dict[int, ProjectCase] = {}
    for c in res.scalars().all():
        merged[c.ordinal] = c
        merged[c.id] = c
    return merged


def _static_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "static"


@router.post("/", response_model=TeamRead, dependencies=[Depends(is_user_admin)])
async def create_team(payload: TeamCreate, db: AsyncSession = Depends(get_async_db)) -> Team:
    data = payload.model_dump()
    if not data.get("invite_code"):
        data["invite_code"] = await generate_unique_invite_code(db)
    team = Team(**data)
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team


@router.get("/", response_model=List[TeamPublicCardRead])
async def list_teams(db: AsyncSession = Depends(get_async_db)) -> List[TeamPublicCardRead]:
    """Гости и все пользователи: публичные поля + кейс и состав."""
    stmt = (
        select(Team)
        .options(
            selectinload(Team.team_members).selectinload(TeamMember.user),
            selectinload(Team.case_assignment).selectinload(ProjectCaseTeam.case),
        )
        .order_by(Team.id)
    )
    rows = list((await db.execute(stmt)).scalars().all())
    by_ord = await _cases_by_ordinal_for_teams(db, rows)
    return [_team_public_card(t, by_ord) for t in rows]


@router.get("/my/summary", response_model=MyTeamSummary)
async def my_team_summary(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> MyTeamSummary:
    stmt = (
        select(TeamMember)
        .where(TeamMember.user_id == current_user.id)
        .options(
            selectinload(TeamMember.team).selectinload(Team.team_members).selectinload(TeamMember.user),
        )
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if not row or not row.team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Вы не в команде")

    team = row.team
    members_sorted = sorted(
        team.team_members,
        key=lambda m: (0 if m.role == TeamMemberRole.CAPTAIN else 1, m.id),
    )
    members_out = [
        TeamMemberOut(
            user_id=str(m.user_id),
            username=m.user.username,
            role=m.role,
        )
        for m in members_sorted
        if m.user is not None
    ]
    tr = TeamRead.model_validate(team)
    if row.role != TeamMemberRole.CAPTAIN:
        tr = tr.model_copy(update={"invite_code": None})
    invite = team.invite_code if row.role == TeamMemberRole.CAPTAIN else None
    return MyTeamSummary(team=tr, my_role=row.role, members=members_out, invite_code=invite)


@router.post("/join-by-invite", response_model=MyTeamSummary)
async def join_team_by_invite(
    payload: JoinByInviteIn,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> MyTeamSummary:
    if current_user.role == UserRole.EXPERT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Эксперты не могут вступать в команды",
        )
    taken = await db.execute(select(TeamMember).where(TeamMember.user_id == current_user.id))
    if taken.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Вы уже в команде",
        )
    code = payload.invite_code.strip()
    team_row = await db.execute(select(Team).where(Team.invite_code == code))
    team = team_row.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Неверный код приглашения")

    cnt = await db.execute(select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team.id))
    n = int(cnt.scalar_one() or 0)
    if n >= settings.MAX_TEAM_MEMBERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Команда заполнена")

    db.add(TeamMember(team_id=team.id, user_id=current_user.id, role=TeamMemberRole.MEMBER))
    await db.commit()

    stmt = (
        select(TeamMember)
        .where(TeamMember.user_id == current_user.id)
        .options(
            selectinload(TeamMember.team).selectinload(Team.team_members).selectinload(TeamMember.user),
        )
    )
    row = (await db.execute(stmt)).scalar_one()
    team = row.team
    members_sorted = sorted(
        team.team_members,
        key=lambda m: (0 if m.role == TeamMemberRole.CAPTAIN else 1, m.id),
    )
    members_out = [
        TeamMemberOut(user_id=str(m.user_id), username=m.user.username, role=m.role)
        for m in members_sorted
        if m.user is not None
    ]
    tr = TeamRead.model_validate(team).model_copy(update={"invite_code": None})
    return MyTeamSummary(team=tr, my_role=row.role, members=members_out, invite_code=None)


@router.get("/{team_id}/full", response_model=TeamRead)
async def get_team_full(
    team_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Team:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    await assert_team_participant_or_jury(db, current_user, team_id)
    return team


@router.get("/{team_id}", response_model=TeamPublicCardRead)
async def get_team(team_id: int, db: AsyncSession = Depends(get_async_db)) -> TeamPublicCardRead:
    """Публичная карточка: без контактов, с кейсом и составом (имена + роль)."""
    stmt = (
        select(Team)
        .where(Team.id == team_id)
        .options(
            selectinload(Team.team_members).selectinload(TeamMember.user),
            selectinload(Team.case_assignment).selectinload(ProjectCaseTeam.case),
        )
    )
    team = (await db.execute(stmt)).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    by_ord = await _cases_by_ordinal_for_teams(db, [team])
    return _team_public_card(team, by_ord)


@router.get("/{team_id}/members", response_model=List[TeamMemberOut])
async def list_team_members(
    team_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> List[TeamMemberOut]:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    await assert_team_participant_or_jury(db, current_user, team_id)
    stmt = (
        select(TeamMember)
        .where(TeamMember.team_id == team_id)
        .options(selectinload(TeamMember.user))
        .order_by(TeamMember.id)
    )
    rows = list((await db.execute(stmt)).scalars().all())
    return [
        TeamMemberOut(user_id=str(m.user_id), username=m.user.username, role=m.role)
        for m in rows
        if m.user is not None
    ]


@router.patch("/{team_id}/brief", response_model=TeamRead)
async def update_team_brief(
    team_id: int,
    payload: TeamBriefUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Team:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    m_row = await db.execute(
        select(TeamMember).where(
            TeamMember.user_id == current_user.id,
            TeamMember.team_id == team_id,
        )
    )
    membership = m_row.scalar_one_or_none()
    if not membership or membership.role != TeamMemberRole.CAPTAIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только капитан может обновлять материалы для жюри",
        )
    data = payload.model_dump(exclude_unset=True)
    if "description" in data:
        team.description = data["description"]
    if "repo_url" in data:
        team.repo_url = data["repo_url"]
    if "screenshots_urls" in data and data["screenshots_urls"] is not None:
        team.screenshots_json = json.dumps(data["screenshots_urls"])
    if "solution_submission_url" in data:
        if not await submission_window_open(db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ссылку на решение можно менять только до окончания таймера",
            )
        team.solution_submission_url = data["solution_submission_url"]
    await db.commit()
    await db.refresh(team)
    return team


@router.post("/{team_id}/photo", response_model=TeamRead)
async def upload_team_photo(
    team_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Team:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    m_row = await db.execute(
        select(TeamMember).where(
            TeamMember.user_id == current_user.id,
            TeamMember.team_id == team_id,
        )
    )
    if m_row.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Не участник этой команды")

    ct = (file.content_type or "").split(";")[0].strip().lower()
    ext = ALLOWED_PHOTO_TYPES.get(ct)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Допустимы только JPEG, PNG или WebP",
        )
    raw = await file.read()
    if len(raw) > MAX_PHOTO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл слишком большой: максимум {MAX_PHOTO_BYTES // (1024 * 1024)} МБ",
        )

    static_dir = _static_dir()
    upload_root = static_dir / "uploads" / "teams" / str(team_id)
    upload_root.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename or "photo")[:80]
    if not safe_name.endswith(ext):
        safe_name = f"{Path(safe_name).stem}{ext}"
    dest = upload_root / safe_name
    dest.write_bytes(raw)

    team.photo_url = f"/static/uploads/teams/{team_id}/{dest.name}"
    await db.commit()
    await db.refresh(team)
    return team


@router.patch("/{team_id}", response_model=TeamRead, dependencies=[Depends(is_user_admin)])
async def update_team(
    team_id: int,
    payload: TeamUpdate,
    db: AsyncSession = Depends(get_async_db),
) -> Team:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return team
    if "case_number" in data:
        await _assert_case_number_exists(db, data["case_number"])
    if "name" in data:
        exists = await db.execute(
            select(Team).where(Team.name == data["name"], Team.id != team_id)
        )
        if exists.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Team name already exists"
            )
    for k, v in data.items():
        setattr(team, k, v)
    await db.commit()
    await db.refresh(team)
    return team


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(is_user_admin)],
)
async def delete_team(team_id: int, db: AsyncSession = Depends(get_async_db)) -> None:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    await db.execute(delete(Score).where(Score.team_id == team_id))
    await db.execute(delete(Message).where(Message.team_id == team_id))
    await db.execute(delete(TeamMember).where(TeamMember.team_id == team_id))
    await db.execute(delete(Team).where(Team.id == team_id))
    await db.commit()
