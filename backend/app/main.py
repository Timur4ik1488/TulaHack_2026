import asyncio
import contextlib
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator
from socketio import ASGIApp
from sqlalchemy import select

from app.api.routes import auth, cases, chat, criteria, hackathon_about, scores, sympathy, teams, timer, users, telegram as tg_routes
from app.core.auth import hash_password
from app.core.hackathon_watch import timer_watch_loop
from app.core.config import settings
from app.core.socket import sio
from app.db.db import AsyncSessionLocal
from app.models import User, UserRole


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Схема БД: Alembic при старте контейнера (compose: alembic upgrade head).

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
    tick = asyncio.create_task(timer_watch_loop())
    try:
        yield
    finally:
        tick.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await tick


fastapi_app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    description="HackSwipe API — PostgreSQL + Alembic",
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


@fastapi_app.get("/health", include_in_schema=False)
async def health() -> dict[str, str]:
    """Лёгкий liveness для Docker healthcheck (без обращения к БД)."""
    return {"status": "ok"}


fastapi_app.include_router(auth.router, prefix="/api/auth")
fastapi_app.include_router(teams.router, prefix="/api/teams")
fastapi_app.include_router(criteria.router, prefix="/api/criteria")
fastapi_app.include_router(scores.router, prefix="/api/scores")
fastapi_app.include_router(sympathy.router, prefix="/api/sympathy")
fastapi_app.include_router(users.router, prefix="/api/users")
fastapi_app.include_router(chat.router, prefix="/api/chat")
fastapi_app.include_router(timer.router, prefix="/api/timer")
fastapi_app.include_router(cases.router, prefix="/api/cases")
fastapi_app.include_router(hackathon_about.router, prefix="/api/hackathon")
fastapi_app.include_router(tg_routes.router, prefix="/api/telegram")

Instrumentator(
    should_instrument_requests_inprogress=True,
    inprogress_labels=True,
    excluded_handlers=["^/metrics$"],
).instrument(fastapi_app).expose(
    fastapi_app,
    endpoint="/metrics",
    include_in_schema=False,
)

_static_root = Path(__file__).resolve().parent / "static"
_static_root.mkdir(parents=True, exist_ok=True)
(_static_root / "uploads").mkdir(parents=True, exist_ok=True)
fastapi_app.mount("/static", StaticFiles(directory=str(_static_root)), name="static")

app = ASGIApp(sio, other_asgi_app=fastapi_app)
