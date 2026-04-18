import enum
import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey, Integer, SmallInteger, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SympathyDimension(str, enum.Enum):
    """По чему зритель отмечает симпатию (без критериев жюри)."""

    AVATAR = "avatar"
    DESCRIPTION = "description"
    NAME = "name"
    OVERALL = "overall"


class SympathyVote(Base):
    __tablename__ = "sympathy_votes"
    __table_args__ = (UniqueConstraint("user_id", "team_id", "dimension", name="uq_sympathy_user_team_dim"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id", ondelete="CASCADE"))
    dimension: Mapped[SympathyDimension] = mapped_column(
        SAEnum(
            SympathyDimension,
            name="sympathydimension",
            values_callable=lambda obj: [e.value for e in obj],
            native_enum=False,
        ),
        nullable=False,
    )
    value: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    voter: Mapped["User"] = relationship(back_populates="sympathy_votes_cast")
    team: Mapped["Team"] = relationship(back_populates="sympathy_votes")
