import enum
import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey, Integer, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TeamMemberRole(str, enum.Enum):
    CAPTAIN = "captain"
    MEMBER = "member"


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_members_team_user"),
        UniqueConstraint("user_id", name="uq_team_members_one_team_per_user"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[TeamMemberRole] = mapped_column(
        SAEnum(
            TeamMemberRole,
            name="teammemberrole",
            values_callable=lambda obj: [e.value for e in obj],
            native_enum=False,
        ),
        nullable=False,
    )

    team: Mapped["Team"] = relationship(back_populates="team_members")
    user: Mapped["User"] = relationship(back_populates="team_memberships")
