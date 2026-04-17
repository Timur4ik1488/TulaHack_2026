from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.team import Team


async def generate_unique_invite_code(db: AsyncSession) -> str:
    for _ in range(64):
        code = Team.generate_invite_code()
        exists = await db.execute(select(Team.id).where(Team.invite_code == code))
        if exists.scalar_one_or_none() is None:
            return code
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Could not generate invite code",
    )
