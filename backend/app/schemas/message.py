import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict


class MessageCreate(BaseModel):
    team_id: int
    text: str


class MessageRead(BaseModel):
    """Ответ API и payload Socket.IO `new_message`."""

    model_config = ConfigDict()

    id: int
    team_id: int
    author_id: uuid.UUID
    author_username: str
    author_role_label: str
    text: str
    created_at: dt.datetime
