from typing import Optional

from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    name: str
    members: str
    contact: str
    description: Optional[str] = None
    case_number: Optional[int] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    members: Optional[str] = None
    contact: Optional[str] = None
    description: Optional[str] = None
    case_number: Optional[int] = None


class TeamPublicRead(BaseModel):
    """Команда для гостей и публичного каталога (без контактов и состава)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    case_number: Optional[int] = None


class TeamRead(TeamCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
