import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CaseExpertBrief(BaseModel):
    """Эксперт на кейсе (для отображения имён всем ролям)."""

    user_id: uuid.UUID
    username: str


class CaseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    company_name: str = Field(..., min_length=1, max_length=255)


class CaseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)


class CaseExpertIds(BaseModel):
    user_ids: List[uuid.UUID] = Field(default_factory=list)


class CaseTeamAssign(BaseModel):
    team_id: int


class CaseTeamBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_id: int
    team_name: str


class CaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ordinal: int
    title: str
    description: Optional[str] = None
    company_name: str
    created_at: datetime


class CaseDetailRead(CaseRead):
    experts: List[CaseExpertBrief] = Field(default_factory=list)
    expert_user_ids: List[uuid.UUID] = Field(default_factory=list)
    teams: List[CaseTeamBrief] = Field(default_factory=list)
