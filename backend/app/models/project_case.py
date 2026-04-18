import datetime as dt
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProjectCase(Base):
    """Кейс хакатона: номер, название, описание, компания."""

    __tablename__ = "project_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )

    experts: Mapped[list["ProjectCaseExpert"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    teams: Mapped[list["ProjectCaseTeam"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )


class ProjectCaseExpert(Base):
    __tablename__ = "project_case_experts"

    case_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project_cases.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )

    case: Mapped["ProjectCase"] = relationship(back_populates="experts")
    user: Mapped["User"] = relationship(back_populates="case_expert_links")


class ProjectCaseTeam(Base):
    __tablename__ = "project_case_teams"
    __table_args__ = (UniqueConstraint("team_id", name="uq_project_case_teams_team"),)

    case_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project_cases.id", ondelete="CASCADE"), primary_key=True
    )
    team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True
    )

    case: Mapped["ProjectCase"] = relationship(back_populates="teams")
    team: Mapped["Team"] = relationship(back_populates="case_assignment")
