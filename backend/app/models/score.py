import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Score(Base):
    __tablename__ = "scores"
    __table_args__ = (UniqueConstraint("expert_id", "team_id", "criterion_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    expert_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"))
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"))
    criterion_id: Mapped[int] = mapped_column(Integer, ForeignKey("criteria.id"))
    value: Mapped[float] = mapped_column(Float)
    is_final: Mapped[bool] = mapped_column(Boolean, default=False)
    jury_comment: Mapped[str | None] = mapped_column(String(500), nullable=True)

    expert: Mapped["User"] = relationship(back_populates="scores")
    team: Mapped["Team"] = relationship(back_populates="scores")
    criterion: Mapped["Criterion"] = relationship(back_populates="scores")
