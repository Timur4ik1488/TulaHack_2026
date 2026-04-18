from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HackathonTimer(Base):
    """Одна строка id=1: дедлайн обратного отсчёта (UTC)."""

    __tablename__ = "hackathon_timer"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_event_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    """Сколько минут было задано при последнем старте (для UI и отчётов)."""
    last_duration_minutes: Mapped[float | None] = mapped_column(Float(), nullable=True)
