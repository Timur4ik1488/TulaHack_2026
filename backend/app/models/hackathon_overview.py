from datetime import datetime

from sqlalchemy import DateTime, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HackathonOverview(Base):
    """Одна строка id=1: краткий текст «о хакатоне» для публичной страницы."""

    __tablename__ = "hackathon_overview"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    intro: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
