import enum
import uuid

from sqlalchemy import Boolean, Enum as SAEnum, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EXPERT = "expert"
    PARTICIPANT = "participant"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(255), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        SAEnum(
            UserRole,
            name="userrole",
            values_callable=lambda obj: [e.value for e in obj],
            native_enum=False,
        ),
        default=UserRole.PARTICIPANT,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    scores: Mapped[list["Score"]] = relationship(back_populates="expert")
    messages: Mapped[list["Message"]] = relationship(back_populates="author")
    team_memberships: Mapped[list["TeamMember"]] = relationship(back_populates="user")
    sympathy_votes_cast: Mapped[list["SympathyVote"]] = relationship(back_populates="voter")
