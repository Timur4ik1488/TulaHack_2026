from pydantic import BaseModel, ConfigDict, Field, computed_field


class ScoreCreate(BaseModel):
    team_id: int
    criterion_id: int
    value: float


class ScoreRead(ScoreCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    expert_id: str | None = None
    is_final: bool = False


class TeamRatingRead(BaseModel):
    """Рейтинг: total_percent — доля от максимума, 0–100 (при весах критериев на 100%)."""

    rank: int
    team_id: int
    team_name: str
    total_percent: float = Field(
        ...,
        description="Сумма по критериям: avg(оценка)/max * weight(%). Макс. 100 при сумме весов 100.",
    )

    @computed_field
    @property
    def total_score(self) -> float:
        """Совместимость со старым полем; совпадает с total_percent."""
        return self.total_percent


class TeamScoreCriterionBreakdown(BaseModel):
    criterion_id: int
    criterion_name: str
    weight_percent: float
    max_score: float
    avg_expert_score: float
    """Доля набранных баллов по критерию, % от max (0–100)."""
    criterion_fill_percent: float
    """Вклад в общий итог команды, п.п. (0–100)."""
    weighted_contribution_percent: float


class TeamScoreBreakdownRead(BaseModel):
    team_id: int
    team_name: str
    total_percent: float
    criteria: list[TeamScoreCriterionBreakdown]


class ExpertScoreSheetRead(BaseModel):
    """Оценки текущего эксперта по команде (черновик и финал)."""

    team_id: int
    criterion_id: int
    criterion_name: str
    max_score: float
    value: float
    is_final: bool
