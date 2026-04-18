from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator


class ScoreCreate(BaseModel):
    team_id: int
    criterion_id: int
    value: float
    jury_comment: Optional[str] = Field(default=None, max_length=500)

    @field_validator("jury_comment", mode="before")
    @classmethod
    def strip_comment(cls, v: object) -> object:
        if v is None or v == "":
            return None
        if isinstance(v, str):
            t = v.strip()
            return t if t else None
        return v


class ScoreRead(ScoreCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    expert_id: str | None = None
    is_final: bool = False


class TeamRatingRead(BaseModel):
    """Рейтинг: жюри + бонус симпатий (линейно: SYMPATHY_PERCENT_PER_VOTE × сумма голосов), total_percent 0–100."""

    rank: int
    team_id: int
    team_name: str
    case_ordinal: Optional[int] = Field(
        default=None,
        description="Номер кейса (ordinal) для отображения и ссылок.",
    )
    case_id: Optional[int] = Field(
        default=None,
        description="id кейса для ссылки на страницу кейса (если известен).",
    )
    case_title: Optional[str] = Field(
        default=None,
        description="Название кейса для лидерборда.",
    )
    jury_percent: float = Field(
        ...,
        description="Итог жюри по весам критериев, %.",
    )
    sympathy_bonus_percent: float = Field(
        0.0,
        description="Добавка от зрительских симпатий, п.п. (сумма голосов × SYMPATHY_PERCENT_PER_VOTE).",
    )
    sympathy_votes_sum: int = Field(
        0,
        description="Сумма голосов симпатий (+1/−1) по измерению overall для команды.",
    )
    total_percent: float = Field(
        ...,
        description="Итог для лидерборда: jury_percent + sympathy_bonus (макс. 100).",
    )

    @computed_field
    @property
    def total_score(self) -> float:
        """Совместимость со старым полем; совпадает с total_percent."""
        return self.total_percent


class TeamScoreCriterionExpertLine(BaseModel):
    """Одна финальная оценка эксперта по критерию (для капитана в разборе)."""

    expert_username: str
    value: float
    comment: Optional[str] = None


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
    expert_lines: list[TeamScoreCriterionExpertLine] = Field(default_factory=list)


class TeamScoreBreakdownRead(BaseModel):
    team_id: int
    team_name: str
    total_percent: float
    """Сумма по критериям (только жюри)."""
    sympathy_bonus_percent: float = 0.0
    sympathy_votes_sum: int = 0
    """Сумма голосов зрителей (+1/−1) по overall для команды."""
    sympathy_cap_percent: float = Field(
        0.0,
        description="Масштаб для полоски симпатий в UI (SYMPATHY_LEADERBOARD_WEIGHT или больше текущего бонуса).",
    )
    leaderboard_total_percent: float = 0.0
    """Итог как в лидерборде (жюри + симпатии)."""
    criteria: list[TeamScoreCriterionBreakdown]


class ExpertScoreSheetRead(BaseModel):
    """Оценки текущего эксперта по команде (черновик и финал)."""

    team_id: int
    criterion_id: int
    criterion_name: str
    max_score: float
    value: float
    is_final: bool
    jury_comment: Optional[str] = None
