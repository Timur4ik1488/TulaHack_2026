from pathlib import Path
import os

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        title="Настройки проекта",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",
        case_sensitive=True,
    )

    APP_NAME: str = "TulaHack 2026 best site of DevOps community"
    DEBUG: bool = False


    SECRET_KEY: str = ""
    DOCS_USER: str = ""
    DOCS_PASSWORD: str = ""

    SESSION_COOKIE_NAME: str = "session_token"
    SESSION_EXPIRE_SECONDS: int = 60 * 60

    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_DAYS: int = 7

    COOKIE_HTTPONLY: bool = True
    COOKIE_SECURE: bool = False  # True только при HTTPS
    COOKIE_SAMESITE: Literal['lax', 'strict', 'none'] = "lax"

    # Dev bootstrap
    BOOTSTRAP_ADMIN: bool = True
    BOOTSTRAP_ADMIN_EMAIL: str = "admin@example.com"
    BOOTSTRAP_ADMIN_PASSWORD: str = "admin"

    DATABASE_URL: str | None = None
    POSTGRES_USER: str = ""
    POSTGRES_PASSWORD: str = ""
    POSTGRES_HOST: str = ""  # имя сервиса из docker-compose
    POSTGRES_PORT: str = ""
    POSTGRES_DB: str = ""
    

    @property
    def get_db_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        else:
            return (f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}")
        

settings = Settings()