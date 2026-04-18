from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        title="Настройки проекта",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",
        case_sensitive=True,
    )

    APP_NAME: str = "HackSwipe API"
    DEBUG: bool = False

    SECRET_KEY: str = ""
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_DAYS: int = 7

    COOKIE_HTTPONLY: bool = True
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    COOKIE_PATH: str = "/"

    ACCESS_COOKIE_NAME: str = "access_token"
    REFRESH_COOKIE_NAME: str = "refresh_token"

    CORS_ORIGINS: str = (
        "http://localhost,http://127.0.0.1,"
        "http://localhost:80,http://127.0.0.1:80,"
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173,"
        "http://localhost:8080,http://127.0.0.1:8080,"
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:8000,http://127.0.0.1:8000"
    )

    # Дефолтная аватарка команды (файл в app/static/)
    DEFAULT_TEAM_PHOTO_URL: str = "/static/default-team-avatar.png"

    BOOTSTRAP_ADMIN: bool = True
    BOOTSTRAP_ADMIN_EMAIL: str = "admin@example.com"
    BOOTSTRAP_ADMIN_PASSWORD: str = "admin"

    DATABASE_URL: str | None = None
    POSTGRES_USER: str = ""
    POSTGRES_PASSWORD: str = ""
    POSTGRES_HOST: str = ""
    POSTGRES_PORT: str = ""
    POSTGRES_DB: str = ""

    MAX_TEAM_MEMBERS: int = 8

    # Зрительские симпатии: до стольких процентных пунктов добавляются к итогу жюри (0–100).
    SYMPATHY_LEADERBOARD_WEIGHT: float = 5.0

    TELEGRAM_BOT_USERNAME: str = "HackSwipeBot"
    TELEGRAM_BOT_TOKEN: str = Field(
        default="",
        validation_alias=AliasChoices("TELEGRAM_BOT_TOKEN", "BOT_TOKEN"),
    )
    TELEGRAM_INTERNAL_SECRET: str = ""
    TELEGRAM_ADMIN_CHAT_ID: str = Field(
        default="",
        validation_alias=AliasChoices("TELEGRAM_ADMIN_CHAT_ID", "ADMIN_CHAT_ID"),
    )

    # Ссылки в ответах бота и письмах (фронтенд без завершающего /).
    PUBLIC_SITE_URL: str = Field(
        default="http://127.0.0.1:5173",
        validation_alias=AliasChoices("PUBLIC_SITE_URL", "SITE_URL", "FRONTEND_URL", "VITE_APP_URL"),
    )

    @property
    def get_db_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            "postgresql+asyncpg://"
            f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
