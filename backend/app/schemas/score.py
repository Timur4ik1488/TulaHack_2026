from pydantic import BaseModel, ConfigDict


class ScoreCreate(BaseModel):
    team_id: int
    criterion_id: int
    value: float


class ScoreRead(ScoreCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_final: bool


class TeamRatingRead(BaseModel):
    team_id: int
    team_name: str
    total_score: float
