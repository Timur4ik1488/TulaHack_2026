from typing import List, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.sympathy_vote import SympathyDimension


class SympathyVoteCreate(BaseModel):
    """Только общая симпатия (на бэкенде фиксируется dimension=overall)."""

    team_id: int = Field(..., ge=1)
    value: Literal[-1, 1]


class SympathyVoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_id: int
    dimension: SympathyDimension
    value: int


class SympathyLeaderboardRow(BaseModel):
    team_id: int
    team_name: str
    score: int


class SympathyLeaderboardResponse(BaseModel):
    rows: List[SympathyLeaderboardRow]


class SympathyTeamTotal(BaseModel):
    team_id: int
    total: int
