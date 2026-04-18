import socketio

from app.core.config import settings

# Должно совпадать с Origin браузера (включая PUBLIC_SITE_URL), иначе handshake 403.
_sio_origins = settings.socketio_cors_allowed_origins
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=_sio_origins,
    allow_upgrades=True,
)


@sio.event
async def connect(sid: str, environ: dict) -> None:
    _ = environ
    print(f"Socket connected: {sid}")


@sio.event
async def disconnect(sid: str) -> None:
    print(f"Socket disconnected: {sid}")


@sio.event
async def join_team_chat(sid: str, data: dict) -> None:
    team_id = data.get("team_id")
    if team_id is None:
        return
    await sio.enter_room(sid, f"team_{team_id}")
