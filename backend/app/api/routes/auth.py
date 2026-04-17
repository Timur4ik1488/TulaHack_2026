import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_user,
    get_refresh_token_from_cookie_or_header,
)
from app.core.auth import (
    TOKEN_TYPE_REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.config import settings
from app.core.team_invite import generate_unique_invite_code
from app.db.db import get_async_db
from app.models.team import Team
from app.models.team_member import TeamMember, TeamMemberRole
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, UserRead

router = APIRouter(tags=["auth"])


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    access_max_age = settings.JWT_ACCESS_EXPIRE_MINUTES * 60
    refresh_max_age = settings.JWT_REFRESH_DAYS * 24 * 60 * 60
    cookie_kwargs: Dict[str, Any] = {
        "httponly": settings.COOKIE_HTTPONLY,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
        "path": settings.COOKIE_PATH,
    }
    response.set_cookie(
        settings.ACCESS_COOKIE_NAME,
        access_token,
        max_age=access_max_age,
        **cookie_kwargs,
    )
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=refresh_max_age,
        **cookie_kwargs,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        settings.ACCESS_COOKIE_NAME,
        path=settings.COOKIE_PATH,
        samesite=settings.COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.REFRESH_COOKIE_NAME,
        path=settings.COOKIE_PATH,
        samesite=settings.COOKIE_SAMESITE,
    )


@router.post("/register", response_model=UserRead)
async def register_user(
    payload: UserCreate,
    response: Response,
    db: AsyncSession = Depends(get_async_db),
) -> User:
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email exists")

    result_u = await db.execute(select(User).where(User.username == payload.username))
    if result_u.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username exists")

    invite_raw = (payload.invite_code or "").strip()
    invite = invite_raw or None

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=UserRole.PARTICIPANT,
    )
    db.add(user)

    try:
        await db.flush()

        if payload.new_team:
            exists = await db.execute(select(Team).where(Team.name == payload.new_team.name))
            if exists.scalar_one_or_none():
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Команда с таким названием уже есть",
                )
            code = await generate_unique_invite_code(db)
            team = Team(
                name=payload.new_team.name,
                contact=payload.new_team.contact,
                description=payload.new_team.description,
                members=payload.new_team.roster_line or "",
                invite_code=code,
                repo_url=payload.new_team.repo_url,
            )
            db.add(team)
            await db.flush()
            db.add(
                TeamMember(
                    team_id=team.id,
                    user_id=user.id,
                    role=TeamMemberRole.CAPTAIN,
                )
            )
        elif invite:
            team_row = await db.execute(select(Team).where(Team.invite_code == invite))
            team = team_row.scalar_one_or_none()
            if not team:
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Неверный код приглашения",
                )
            cnt = await db.execute(
                select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team.id)
            )
            if int(cnt.scalar_one() or 0) >= settings.MAX_TEAM_MEMBERS:
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Команда заполнена",
                )
            db.add(
                TeamMember(
                    team_id=team.id,
                    user_id=user.id,
                    role=TeamMemberRole.MEMBER,
                )
            )

        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Конфликт данных (почта, ник или членство в команде)",
        ) from None

    await db.refresh(user)
    access = create_access_token({"sub": str(user.id)})
    refresh = create_refresh_token({"sub": str(user.id)})
    _set_auth_cookies(response, access, refresh)
    return user


@router.post("/login")
async def login_user(
    payload: UserLogin, response: Response, db: AsyncSession = Depends(get_async_db)
) -> Dict[str, Any]:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active or user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User forbidden!",
        )

    sub = str(user.id)
    access = create_access_token({"sub": sub})
    refresh = create_refresh_token({"sub": sub})
    _set_auth_cookies(response, access, refresh)
    return {"ok": True, "role": user.role.value}


@router.post("/refresh")
async def refresh_tokens(
    response: Response,
    db: AsyncSession = Depends(get_async_db),
    refresh_token: Optional[str] = Depends(get_refresh_token_from_cookie_or_header),
) -> Dict[str, Any]:
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not provided",
        )

    payload = decode_token(refresh_token)
    if payload.get("type") != TOKEN_TYPE_REFRESH:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный тип токена!",
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject is missing.",
        )

    try:
        user_id = uuid.UUID(str(sub))
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject is invalid.",
        ) from exc

    user = await db.get(User, user_id)
    if not user or not user.is_active or user.is_blocked:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User forbidden!",
        )

    new_access = create_access_token({"sub": str(user.id)})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    _set_auth_cookies(response, new_access, new_refresh)
    return {"ok": True, "role": user.role.value}


@router.post("/logout")
async def logout_user(response: Response) -> Dict[str, Any]:
    _clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
