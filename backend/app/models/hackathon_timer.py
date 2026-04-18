from datetime import datetime

from sqlalchemy import DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HackathonTimer(Base):
    """Одна строка id=1: дедлайн обратного отсчёта (UTC)."""

    __tablename__ = "hackathon_timer"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
