import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import is_user_admin
from app.db.db import get_async_db
from app.models.hackathon_timer import HackathonTimer
from app.models.user import User
from app.core.timer_helpers import compute_timer_client_state
from app.schemas.timer import TimerStartIn, TimerStateRead

router = APIRouter(tags=["timer"])

TIMER_ROW_ID = 1


async def _get_timer_row(db: AsyncSession) -> HackathonTimer:
    row = await db.get(HackathonTimer, TIMER_ROW_ID)
    if row is None:
        row = HackathonTimer(
            id=TIMER_ROW_ID,
            deadline_at=None,
            ended_event_sent=False,
            last_duration_minutes=None,
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


@router.get("/", response_model=TimerStateRead)
async def get_timer_state(db: AsyncSession = Depends(get_async_db)) -> TimerStateRead:
    row = await _get_timer_row(db)
    now = dt.datetime.now(dt.timezone.utc)
    open_, passed, rem = compute_timer_client_state(row.deadline_at, now)
    return TimerStateRead(
        deadline_at=row.deadline_at,
        server_now=now,
        submission_window_open=open_,
        deadline_passed=passed,
        seconds_remaining=rem,
        last_duration_minutes=row.last_duration_minutes,
    )


@router.post("/start", response_model=TimerStateRead)
async def start_timer(
    payload: TimerStartIn,
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(is_user_admin),
) -> TimerStateRead:
    if payload.minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Количество минут должно быть больше нуля",
        )
    row = await _get_timer_row(db)
    now = dt.datetime.now(dt.timezone.utc)
    row.deadline_at = now + dt.timedelta(minutes=payload.minutes)
    row.ended_event_sent = False
    row.last_duration_minutes = float(payload.minutes)
    await db.commit()
    await db.refresh(row)
    now2 = dt.datetime.now(dt.timezone.utc)
    open_, passed, rem = compute_timer_client_state(row.deadline_at, now2)
    return TimerStateRead(
        deadline_at=row.deadline_at,
        server_now=now2,
        submission_window_open=open_,
        deadline_passed=passed,
        seconds_remaining=rem,
        last_duration_minutes=row.last_duration_minutes,
    )


@router.post("/stop", response_model=TimerStateRead)
async def stop_timer(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(is_user_admin),
) -> TimerStateRead:
    row = await _get_timer_row(db)
    row.deadline_at = None
    row.ended_event_sent = False
    await db.commit()
    await db.refresh(row)
    now = dt.datetime.now(dt.timezone.utc)
    open_, passed, rem = compute_timer_client_state(row.deadline_at, now)
    return TimerStateRead(
        deadline_at=row.deadline_at,
        server_now=now,
        submission_window_open=open_,
        deadline_passed=passed,
        seconds_remaining=rem,
        last_duration_minutes=row.last_duration_minutes,
    )
