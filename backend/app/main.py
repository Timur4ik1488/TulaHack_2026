from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from socketio import ASGIApp
from sqlalchemy import select

from app.api.routes import auth, chat, criteria, scores, teams, users
from app.core.auth import hash_password
from app.core.config import settings
from app.core.socket import sio
from app.db.base import Base
from app.db.db import AsyncSessionLocal, engine
from app.db.sqlite_schema import upgrade_sqlite_schema
from app.models import (  # noqa: F401
    Criterion,
    Message,
    Score,
    Team,
    TeamMember,
    User,
    UserRole,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # PostgreSQL: Alembic (compose). Локально: USE_SQLITE + create_all.
    if settings.USE_SQLITE:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(upgrade_sqlite_schema)

    if settings.BOOTSTRAP_ADMIN:
        async with AsyncSessionLocal() as db:
            admin_query = await db.execute(
                select(User).where(User.email == settings.BOOTSTRAP_ADMIN_EMAIL)
            )
            if not admin_query.scalar_one_or_none():
                db.add(
                    User(
                        email=settings.BOOTSTRAP_ADMIN_EMAIL,
                        username="admin",
                        hashed_password=hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
                        role=UserRole.ADMIN,
                    )
                )
                await db.commit()
    yield


fastapi_app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    description="HackSwipe API — свайп-оценка команд хакатона (PostgreSQL)",
    lifespan=lifespan,
    version="0.1.0",
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.include_router(auth.router, prefix="/api/auth")
fastapi_app.include_router(teams.router, prefix="/api/teams")
fastapi_app.include_router(criteria.router, prefix="/api/criteria")
fastapi_app.include_router(scores.router, prefix="/api/scores")
fastapi_app.include_router(users.router, prefix="/api/users")
fastapi_app.include_router(chat.router, prefix="/api/chat")

_static_root = Path(__file__).resolve().parent / "static"
_static_root.mkdir(parents=True, exist_ok=True)
(_static_root / "uploads").mkdir(parents=True, exist_ok=True)
fastapi_app.mount("/static", StaticFiles(directory=str(_static_root)), name="static")

app = ASGIApp(sio, other_asgi_app=fastapi_app)
