from pydantic import BaseModel, ConfigDict


class CriterionCreate(BaseModel):
    name: str
    weight: float
    max_score: float


class CriterionRead(CriterionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
