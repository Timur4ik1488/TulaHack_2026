import re
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, is_user_admin
from app.core.auth import hash_password
from app.db.db import get_async_db
from app.models.project_case import ProjectCase, ProjectCaseExpert
from app.models.user import User, UserRole
from app.schemas.case import ExpertCaseCardBrief
from app.schemas.user import ExpertCasesForMeRead, UserAdminCreate, UserRead, UserRoleUpdate

router = APIRouter(tags=["users"])

ALLOWED_AVATAR_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024


def _static_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "static"


async def _save_user_avatar_file(user: User, file: UploadFile) -> None:
    ct = (file.content_type or "").split(";")[0].strip().lower()
    ext = ALLOWED_AVATAR_TYPES.get(ct)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Допустимы только изображения JPEG, PNG или WebP",
        )
    raw = await file.read()
    if len(raw) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл слишком большой: максимум {MAX_AVATAR_BYTES // (1024 * 1024)} МБ",
        )
    upload_root = _static_dir() / "uploads" / "users" / str(user.id)
    upload_root.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename or "avatar")[:80]
    if not safe_name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        safe_name = f"{Path(safe_name).stem}{ext}"
    dest = upload_root / safe_name
    dest.write_bytes(raw)
    user.avatar_url = f"/static/uploads/users/{user.id}/{dest.name}"


@router.get("/", response_model=List[UserRead], dependencies=[Depends(is_user_admin)])
async def list_users(db: AsyncSession = Depends(get_async_db)) -> List[User]:
    result = await db.execute(select(User).order_by(User.username))
    return list(result.scalars().all())


@router.post(
    "/",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(is_user_admin)],
)
async def create_user_admin(
    payload: UserAdminCreate,
    db: AsyncSession = Depends(get_async_db),
) -> User:
    user = User(
        email=str(payload.email),
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email или username уже существует",
        )
    await db.refresh(user)
    return user


@router.post("/me/avatar", response_model=UserRead)
async def upload_my_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> User:
    await _save_user_avatar_file(current_user, file)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me/expert-cases", response_model=ExpertCasesForMeRead)
async def my_expert_cases(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> ExpertCasesForMeRead:
    if current_user.role != UserRole.EXPERT:
        return ExpertCasesForMeRead(cases=[])
    stmt = (
        select(ProjectCase)
        .join(ProjectCaseExpert, ProjectCaseExpert.case_id == ProjectCase.id)
        .where(ProjectCaseExpert.user_id == current_user.id)
        .order_by(ProjectCase.ordinal.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    cases = [
        ExpertCaseCardBrief(
            case_id=r.id,
            ordinal=r.ordinal,
            title=r.title,
            company_name=r.company_name,
        )
        for r in rows
    ]
    return ExpertCasesForMeRead(cases=cases)


@router.post("/{user_id}/avatar", response_model=UserRead)
async def upload_user_avatar_admin(
    user_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(is_user_admin),
) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await _save_user_avatar_file(user, file)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/role", response_model=UserRead)
async def update_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    db: AsyncSession = Depends(get_async_db),
    admin: User = Depends(is_user_admin),
) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user_id == admin.id and admin.role == UserRole.ADMIN and payload.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Администратор не может понизить собственную роль",
        )
    user.role = payload.role
    await db.commit()
    await db.refresh(user)
    return user
