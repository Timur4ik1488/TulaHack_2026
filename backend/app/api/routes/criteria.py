from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import is_user_admin
from app.db.db import get_async_db
from app.models.criterion import Criterion
from app.schemas.criterion import CriterionCreate, CriterionRead

router = APIRouter(tags=["criteria"])


@router.post("/", response_model=CriterionRead, dependencies=[Depends(is_user_admin)])
async def create_criterion(
    payload: CriterionCreate, db: AsyncSession = Depends(get_async_db)
) -> Criterion:
    total_weight_query = await db.execute(select(func.coalesce(func.sum(Criterion.weight), 0)))
    total_weight = float(total_weight_query.scalar_one())
    if total_weight + payload.weight > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total criteria weight cannot exceed 100",
        )

    criterion = Criterion(**payload.model_dump())
    db.add(criterion)
    await db.commit()
    await db.refresh(criterion)
    return criterion


@router.get("/", response_model=list[CriterionRead])
async def list_criteria(db: AsyncSession = Depends(get_async_db)) -> list[Criterion]:
    result = await db.execute(select(Criterion).order_by(Criterion.id))
    return list(result.scalars().all())
