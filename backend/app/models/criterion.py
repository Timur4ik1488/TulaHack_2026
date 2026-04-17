from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Criterion(Base):
    __tablename__ = "criteria"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    weight: Mapped[float] = mapped_column(Float)
    max_score: Mapped[float] = mapped_column(Float)

    scores: Mapped[list["Score"]] = relationship(back_populates="criterion")
