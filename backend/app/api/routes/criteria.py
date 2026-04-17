from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import is_user_admin
from app.db.db import get_async_db
from app.models.criterion import Criterion
from app.models.score import Score
from app.schemas.criterion import (
    CriterionCreate,
    CriterionRead,
    CriterionUpdate,
    CriteriaWeightsSummary,
)

router = APIRouter(tags=["criteria"])


async def _sum_weights_excluding(db: AsyncSession, exclude_id: Optional[int]) -> float:
    stmt = select(func.coalesce(func.sum(Criterion.weight), 0.0))
    if exclude_id is not None:
        stmt = stmt.where(Criterion.id != exclude_id)
    r = await db.execute(stmt)
    return float(r.scalar_one())


@router.get(
    "/weights-summary",
    response_model=CriteriaWeightsSummary,
    dependencies=[Depends(is_user_admin)],
)
async def criteria_weights_summary(
    db: AsyncSession = Depends(get_async_db),
) -> CriteriaWeightsSummary:
    total = await _sum_weights_excluding(db, None)
    ok = abs(total - 100.0) < 0.02
    return CriteriaWeightsSummary(
        total_weight_percent=round(total, 2), weights_sum_ok=ok
    )


@router.post("/", response_model=CriterionRead, dependencies=[Depends(is_user_admin)])
async def create_criterion(
    payload: CriterionCreate, db: AsyncSession = Depends(get_async_db)
) -> Criterion:
    if payload.max_score <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="max_score must be positive",
        )
    total = await _sum_weights_excluding(db, None)
    if total + payload.weight > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total criteria weight cannot exceed 100",
        )

    criterion = Criterion(**payload.model_dump())
    db.add(criterion)
    await db.commit()
    await db.refresh(criterion)
    return criterion


@router.get("/", response_model=List[CriterionRead])
async def list_criteria(db: AsyncSession = Depends(get_async_db)) -> List[Criterion]:
    """Публично: правила оценки (название, вес %, max балл)."""
    result = await db.execute(select(Criterion).order_by(Criterion.id))
    return list(result.scalars().all())


@router.get("/{criterion_id}", response_model=CriterionRead)
async def get_criterion(criterion_id: int, db: AsyncSession = Depends(get_async_db)) -> Criterion:
    c = await db.get(Criterion, criterion_id)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criterion not found")
    return c


@router.patch("/{criterion_id}", response_model=CriterionRead, dependencies=[Depends(is_user_admin)])
async def update_criterion(
    criterion_id: int,
    payload: CriterionUpdate,
    db: AsyncSession = Depends(get_async_db),
) -> Criterion:
    c = await db.get(Criterion, criterion_id)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criterion not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return c

    new_weight = data.get("weight", c.weight)
    new_max = data.get("max_score", c.max_score)
    if new_max <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="max_score must be positive",
        )

    rest = await _sum_weights_excluding(db, criterion_id)
    if rest + float(new_weight) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total criteria weight cannot exceed 100",
        )

    if "name" in data:
        dup = await db.execute(
            select(Criterion).where(
                Criterion.name == data["name"], Criterion.id != criterion_id
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Criterion name exists"
            )

    for k, v in data.items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    return c


@router.delete(
    "/{criterion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(is_user_admin)],
)
async def delete_criterion(criterion_id: int, db: AsyncSession = Depends(get_async_db)) -> None:
    c = await db.get(Criterion, criterion_id)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criterion not found")
    await db.execute(delete(Score).where(Score.criterion_id == criterion_id))
    await db.execute(delete(Criterion).where(Criterion.id == criterion_id))
    await db.commit()
