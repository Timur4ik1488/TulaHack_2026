"""Серверный таймер хакатона: окно сдачи решения и флаги для API/фронта."""

import datetime as dt

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hackathon_timer import HackathonTimer

TIMER_ROW_ID = 1


def compute_timer_client_state(
    deadline_at: dt.datetime | None, server_now: dt.datetime
) -> tuple[bool, bool, float | None]:
    """Возвращает (submission_window_open, deadline_passed, seconds_remaining)."""
    if deadline_at is None:
        return True, False, None
    rem = float((deadline_at - server_now).total_seconds())
    passed = rem <= 0.0
    return (not passed, passed, rem)


async def submission_window_open(db: AsyncSession) -> bool:
    row = await db.get(HackathonTimer, TIMER_ROW_ID)
    if row is None or row.deadline_at is None:
        return True
    now = dt.datetime.now(dt.timezone.utc)
    return now < row.deadline_at
