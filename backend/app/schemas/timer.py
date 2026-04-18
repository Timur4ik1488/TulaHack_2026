import datetime as dt

from pydantic import BaseModel, ConfigDict, Field


class TimerStateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    deadline_at: dt.datetime | None
    server_now: dt.datetime
    submission_window_open: bool = Field(
        True,
        description="Пока дедлайн не наступил (или таймер выключен) — можно менять ссылку на решение.",
    )
    deadline_passed: bool = Field(
        False,
        description="Серверное время уже после дедлайна (таймер был запущен).",
    )
    seconds_remaining: float | None = Field(
        None,
        description="Секунд до дедлайна; None если таймер не задан.",
    )
    last_duration_minutes: float | None = Field(
        None,
        description="Минуты, заданные админом при последнем старте (пока идёт или после — не путать с оставшимся временем).",
    )


class TimerStartIn(BaseModel):
    minutes: float
