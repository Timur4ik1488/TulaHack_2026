from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    name: str
    members: str
    contact: str
    description: str | None = None
    case_number: int | None = None


class TeamRead(TeamCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
