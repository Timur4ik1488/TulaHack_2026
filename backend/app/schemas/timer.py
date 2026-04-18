import datetime as dt

from pydantic import BaseModel, ConfigDict


class TimerStateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    deadline_at: dt.datetime | None
    server_now: dt.datetime


class TimerStartIn(BaseModel):
    minutes: float
