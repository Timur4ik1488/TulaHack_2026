"""Фоновая проверка дедлайна хакатона: один раз шлём событие в Socket.IO и фиксируем флаг в БД."""

import asyncio
import contextlib
import datetime as dt
import logging

from sqlalchemy import select

from app.core.socket import sio
from app.db.db import AsyncSessionLocal
from app.models.hackathon_timer import HackathonTimer

log = logging.getLogger(__name__)
TIMER_ROW_ID = 1


async def timer_watch_loop() -> None:
    while True:
        try:
            await asyncio.sleep(15)
            async with AsyncSessionLocal() as db:
                row = await db.get(HackathonTimer, TIMER_ROW_ID)
                if row is None or row.deadline_at is None:
                    continue
                now = dt.datetime.now(dt.timezone.utc)
                if now < row.deadline_at:
                    continue
                if row.ended_event_sent:
                    continue
                row.ended_event_sent = True
                await db.commit()
                await sio.emit(
                    "hackathon_ended",
                    {"event": "deadline_passed", "deadline_at": row.deadline_at.isoformat()},
                )
                await sio.emit("rating_updated", {"global": True, "hackathon_ended": True})
                log.info("Hackathon deadline passed: broadcast hackathon_ended")
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("timer_watch_loop iteration failed")
