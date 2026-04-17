import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import is_user_admin
from app.db.db import get_async_db
from app.models.user import User, UserRole
from app.schemas.user import UserRead, UserRoleUpdate

router = APIRouter(tags=["users"])


@router.get("/", response_model=list[UserRead], dependencies=[Depends(is_user_admin)])
async def list_users(db: AsyncSession = Depends(get_async_db)) -> list[User]:
    result = await db.execute(select(User).order_by(User.username))
    return list(result.scalars().all())


@router.patch("/{user_id}/role", response_model=UserRead, dependencies=[Depends(is_user_admin)])
async def update_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    db: AsyncSession = Depends(get_async_db),
) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.role = payload.role
    await db.commit()
    await db.refresh(user)
    return user
