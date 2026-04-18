"""Проверки относительно серверного таймера хакатона (строка hackathon_timer id=1)."""

import datetime as dt

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hackathon_timer import HackathonTimer

TIMER_ROW_ID = 1


async def get_timer_row(db: AsyncSession) -> HackathonTimer | None:
    return await db.get(HackathonTimer, TIMER_ROW_ID)


async def submission_window_open(db: AsyncSession) -> bool:
    """Можно ли ещё менять ссылку на решение и т.п.: пока нет дедлайна или время до дедлайна."""
    row = await get_timer_row(db)
    if row is None or row.deadline_at is None:
        return True
    now = dt.datetime.now(dt.timezone.utc)
    return now < row.deadline_at
