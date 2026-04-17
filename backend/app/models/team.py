from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    members: Mapped[str] = mapped_column(Text)
    contact: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    case_number: Mapped[int | None] = mapped_column(Integer, nullable=True)

    scores: Mapped[list["Score"]] = relationship(back_populates="team")
    messages: Mapped[list["Message"]] = relationship(back_populates="team")
