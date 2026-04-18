import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.user import UserRole


class NewTeamPayload(BaseModel):
    """Создать команду при регистрации (пользователь станет капитаном)."""

    name: str = Field(..., min_length=2, max_length=255)
    contact: str = Field(..., min_length=3, max_length=255)
    description: str | None = None
    repo_url: str | None = None
    roster_line: str | None = Field(
        None,
        description="Строка состава для README (например «@you + @mate»)",
    )


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=4, max_length=128)
    invite_code: str | None = Field(None, max_length=16, description="Код приглашения в существующую команду")
    new_team: NewTeamPayload | None = None

    @model_validator(mode="after")
    def _team_xor(self) -> "UserCreate":
        if self.invite_code and self.new_team:
            raise ValueError("Укажите только invite_code или только new_team")
        return self


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserAdminCreate(BaseModel):
    """Создание пользователя администратором (без регистрации на сайте)."""

    email: EmailStr
    username: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = Field(
        default=UserRole.EXPERT,
        description="Роль нового аккаунта (по умолчанию — эксперт жюри)",
    )


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    username: str
    role: UserRole
    is_active: bool
    is_blocked: bool
    avatar_url: str | None = None
