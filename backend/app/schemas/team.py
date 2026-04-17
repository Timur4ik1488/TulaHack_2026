from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

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


class TeamRead(TeamCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


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
