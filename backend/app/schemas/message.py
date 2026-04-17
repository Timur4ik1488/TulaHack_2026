import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict


class MessageCreate(BaseModel):
    team_id: int
    text: str


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    team_id: int
    author_id: uuid.UUID
    text: str
    created_at: dt.datetime
