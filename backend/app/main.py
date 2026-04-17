from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from socketio import ASGIApp
from sqlalchemy import select

from app.api.routes import auth, chat, criteria, scores, teams, users
from app.core.auth import hash_password
from app.core.config import settings
from app.core.socket import sio
from app.db.db import AsyncSessionLocal
from app.models import User, UserRole


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Схема БД — через Alembic (см. compose: alembic upgrade head).

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
    description="HackRank — оценка хакатонов (TulaHack 2026)",
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

app = ASGIApp(sio, other_asgi_app=fastapi_app)
