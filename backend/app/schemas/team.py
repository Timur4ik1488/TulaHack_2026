import re
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.core.config import settings

from app.models.team_member import TeamMemberRole


class JoinByInviteIn(BaseModel):
    invite_code: str = Field(..., min_length=4, max_length=16)


class TeamCreate(BaseModel):
    name: str
    members: str = ""
    contact: str
    description: Optional[str] = None
    case_number: Optional[int] = None
    photo_url: Optional[str] = None
    invite_code: Optional[str] = Field(None, max_length=16)
    repo_url: Optional[str] = None
    screenshots_json: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    members: Optional[str] = None
    contact: Optional[str] = None
    description: Optional[str] = None
    case_number: Optional[int] = None
    photo_url: Optional[str] = None
    invite_code: Optional[str] = Field(None, max_length=16)
    repo_url: Optional[str] = None
    screenshots_json: Optional[str] = None


class TeamBriefUpdate(BaseModel):
    """Капитан обновляет материалы для жюри."""

    description: Optional[str] = None
    repo_url: Optional[str] = None
    screenshots_urls: Optional[List[str]] = None
    solution_submission_url: Optional[str] = Field(None, max_length=2048)

    @field_validator("solution_submission_url")
    @classmethod
    def _solution_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        if not re.match(r"^https?://", s, re.I):
            raise ValueError("Ссылка на решение должна начинаться с http:// или https://")
        return s


class TeamPublicRead(BaseModel):
    """Публичная карточка + ссылки на решение (для оценки)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    case_number: Optional[int] = None
    photo_url: Optional[str] = None
    repo_url: Optional[str] = None
    screenshots_json: Optional[str] = None
    solution_submission_url: Optional[str] = None

    @field_serializer("photo_url")
    def _serialize_photo_url(self, v: Optional[str]) -> str:
        if v and str(v).strip():
            return str(v).strip()
        return settings.DEFAULT_TEAM_PHOTO_URL


class TeamRead(TeamCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    solution_submission_url: Optional[str] = None

    @field_serializer("photo_url")
    def _serialize_photo_url(self, v: Optional[str]) -> str:
        if v and str(v).strip():
            return str(v).strip()
        return settings.DEFAULT_TEAM_PHOTO_URL


class TeamMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    username: str
    role: TeamMemberRole


class MyTeamSummary(BaseModel):
    team: TeamRead
    my_role: TeamMemberRole
    members: List[TeamMemberOut]
    invite_code: Optional[str] = None
