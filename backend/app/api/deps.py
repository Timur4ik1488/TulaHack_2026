from typing import Optional
from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import TOKEN_TYPE_ACCESS, decode_token
from app.core.config import settings
from app.db.db import get_async_db
from app.models.user import User, UserRole


async def get_access_token_from_cookie_or_header(
    request: Request,
    access_token: Optional[str] = Cookie(None, alias=settings.ACCESS_COOKIE_NAME),
) -> Optional[str]:
    if access_token:
        return access_token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


async def get_refresh_token_from_cookie_or_header(
    request: Request,
    refresh_token: Optional[str] = Cookie(None, alias=settings.REFRESH_COOKIE_NAME),
) -> Optional[str]:
    if refresh_token:
        return refresh_token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


async def get_current_user(
    token: Optional[str] = Depends(get_access_token_from_cookie_or_header),
    db: AsyncSession = Depends(get_async_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен не предоставлен",
        )

    payload = decode_token(token)
    if payload.get("type") != TOKEN_TYPE_ACCESS:
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
        user_id = UUID(str(sub))
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject is invalid.",
        ) from exc

    user = await db.get(User, user_id)
    if not user or not user.is_active or user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User forbidden!",
        )
    return user


async def is_user_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Юзер не обладает правами администратора!",
        )
    return current_user


async def is_user_expert(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {UserRole.EXPERT, UserRole.ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expert access required",
        )
    return current_user
