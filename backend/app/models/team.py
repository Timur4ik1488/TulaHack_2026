import secrets

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    members: Mapped[str] = mapped_column(Text, default="")
    contact: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    case_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    invite_code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    repo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    screenshots_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    scores: Mapped[list["Score"]] = relationship(back_populates="team")
    messages: Mapped[list["Message"]] = relationship(back_populates="team")
    team_members: Mapped[list["TeamMember"]] = relationship(
        back_populates="team", cascade="all, delete-orphan"
    )

    @staticmethod
    def generate_invite_code() -> str:
        return secrets.token_hex(4)[:10]
