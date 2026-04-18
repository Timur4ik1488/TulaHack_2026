import datetime as dt
import secrets
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.db import get_async_db
from app.models.tg_account import TgLinkCode, TgSubscriber
from app.models.user import User
from app.services.telegram_command_replies import compose_telegram_bot_reply

router = APIRouter(tags=["telegram"])


def _require_bot_secret(x_telegram_bot_secret: str | None) -> None:
    if not settings.TELEGRAM_INTERNAL_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TELEGRAM_INTERNAL_SECRET не задан в окружении",
        )
    if not x_telegram_bot_secret or x_telegram_bot_secret != settings.TELEGRAM_INTERNAL_SECRET:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Неверный секрет")


class TgBindIn(BaseModel):
    code: str = Field(..., min_length=8, max_length=64)
    chat_id: int
    tg_username: str | None = None


class TgDeeplinkOut(BaseModel):
    url: str


class TgRecipientsOut(BaseModel):
    chat_ids: List[int]


class BotDispatchIn(BaseModel):
    chat_id: int
    text: str = Field(..., max_length=4096)


class BotDispatchOut(BaseModel):
    text: str


@router.post("/internal/bot-dispatch", response_model=BotDispatchOut)
async def telegram_bot_dispatch(
    payload: BotDispatchIn,
    db: AsyncSession = Depends(get_async_db),
    x_telegram_bot_secret: str | None = Header(default=None, alias="X-Telegram-Bot-Secret"),
) -> BotDispatchOut:
    """Текст для ответа бота в Telegram (секрет + chat_id → данные из БД)."""
    _require_bot_secret(x_telegram_bot_secret)
    msg = await compose_telegram_bot_reply(db, payload.chat_id, payload.text.strip())
    if len(msg) > 4096:
        msg = msg[:4090] + "…"
    return BotDispatchOut(text=msg)


@router.post("/deeplink", response_model=TgDeeplinkOut)
async def create_telegram_deeplink(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> TgDeeplinkOut:
    if not settings.TELEGRAM_BOT_USERNAME:
        raise HTTPException(status_code=503, detail="TELEGRAM_BOT_USERNAME не настроен")
    code = secrets.token_urlsafe(18)[:48]
    exp = dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=15)
    await db.execute(delete(TgLinkCode).where(TgLinkCode.user_id == current_user.id))
    db.add(TgLinkCode(code=code, user_id=current_user.id, expires_at=exp))
    await db.commit()
    uname = settings.TELEGRAM_BOT_USERNAME.lstrip("@")
    return TgDeeplinkOut(url=f"https://t.me/{uname}?start={code}")


@router.post("/bind-bot", response_model=dict)
async def bind_telegram_from_bot(
    payload: TgBindIn,
    db: AsyncSession = Depends(get_async_db),
    x_telegram_bot_secret: str | None = Header(default=None, alias="X-Telegram-Bot-Secret"),
) -> dict:
    _require_bot_secret(x_telegram_bot_secret)
    row = await db.get(TgLinkCode, payload.code)
    if not row:
        raise HTTPException(status_code=404, detail="Код не найден")
    if row.expires_at < dt.datetime.now(dt.timezone.utc):
        await db.execute(delete(TgLinkCode).where(TgLinkCode.code == payload.code))
        await db.commit()
        raise HTTPException(status_code=410, detail="Код истёк")
    uid = row.user_id
    await db.execute(delete(TgLinkCode).where(TgLinkCode.code == payload.code))
    # Один chat_id — один аккаунт; иначе дубликаты ломают bot-dispatch.
    await db.execute(delete(TgSubscriber).where(TgSubscriber.chat_id == payload.chat_id))
    await db.flush()
    sub = await db.get(TgSubscriber, uid)
    if sub:
        sub.chat_id = payload.chat_id
        sub.tg_username = payload.tg_username
    else:
        db.add(
            TgSubscriber(
                user_id=uid,
                chat_id=payload.chat_id,
                tg_username=payload.tg_username,
            )
        )
    await db.commit()
    return {"ok": True, "user_id": str(uid)}


@router.post("/internal/recipients", response_model=TgRecipientsOut)
async def list_recipient_chat_ids(
    db: AsyncSession = Depends(get_async_db),
    x_telegram_bot_secret: str | None = Header(default=None, alias="X-Telegram-Bot-Secret"),
) -> TgRecipientsOut:
    _require_bot_secret(x_telegram_bot_secret)
    r = await db.execute(select(TgSubscriber.chat_id).distinct())
    chats = [int(x[0]) for x in r.all()]
    admin_raw = str(settings.TELEGRAM_ADMIN_CHAT_ID or "").strip()
    if admin_raw:
        try:
            aid = int(admin_raw)
            if aid not in chats:
                chats.append(aid)
        except ValueError:
            pass
    return TgRecipientsOut(chat_ids=chats)
