import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.case import CaseRead, ExpertCaseCardBrief


class StaffPublicBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    username: str
    avatar_url: Optional[str] = None
    assigned_cases: List[ExpertCaseCardBrief] = Field(default_factory=list)


class HackathonAboutIntroPatch(BaseModel):
    intro: str = Field("", max_length=50_000)


class HackathonAboutPublic(BaseModel):
    intro: str
    updated_at: datetime
    experts: List[StaffPublicBrief]
    admins: List[StaffPublicBrief]
    cases: List[CaseRead]
