from pydantic import BaseModel, ConfigDict


class CriterionCreate(BaseModel):
    name: str
    weight: float
    max_score: float


class CriterionUpdate(BaseModel):
    name: str | None = None
    weight: float | None = None
    max_score: float | None = None


class CriterionRead(CriterionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class CriteriaWeightsSummary(BaseModel):
    total_weight_percent: float
    weights_sum_ok: bool
