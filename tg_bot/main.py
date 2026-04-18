"""
HackSwipeBot: polling + уведомления за 1 ч, 15 мин и в момент окончания таймера
(синхронизация с GET /api/timer/ бэкенда). Команды — через POST /api/telegram/internal/bot-dispatch.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

import httpx

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("tg_bot")

TOKEN = (os.environ.get("TELEGRAM_BOT_TOKEN") or os.environ.get("BOT_TOKEN") or "").strip()
INTERNAL_SECRET = (os.environ.get("TELEGRAM_INTERNAL_SECRET") or "").strip()
API_BASE = (os.environ.get("API_BASE_URL") or "http://127.0.0.1:8000").rstrip("/")

if not TOKEN:
    raise SystemExit("TELEGRAM_BOT_TOKEN (или BOT_TOKEN) не задан")
if not INTERNAL_SECRET:
    raise SystemExit("TELEGRAM_INTERNAL_SECRET не задан")


@dataclass
class NotifyState:
    deadline_key: str | None = None
    sent_60: bool = False
    sent_15: bool = False
    sent_end: bool = False
    last_timer_fetch: float = 0.0


STATE = NotifyState()


def tg_url(method: str) -> str:
    return f"https://api.telegram.org/bot{TOKEN}/{method}"


async def tg_post(client: httpx.AsyncClient, method: str, payload: dict[str, Any]) -> dict[str, Any]:
    r = await client.post(tg_url(method), json=payload, timeout=60.0)
    if r.status_code >= 400:
        # В логах Docker видно тело ответа Telegram (описание ошибки), без этого только «400 Bad Request».
        log.warning("Telegram %s HTTP %s: %s", method, r.status_code, (r.text or "")[:800])
    r.raise_for_status()
    data = r.json()
    if not data.get("ok"):
        raise RuntimeError(str(data))
    return data


async def send_text(client: httpx.AsyncClient, chat_id: int, text: str) -> None:
    await tg_post(client, "sendMessage", {"chat_id": chat_id, "text": text})


async def fetch_recipients(client: httpx.AsyncClient) -> list[int]:
    r = await client.post(
        f"{API_BASE}/api/telegram/internal/recipients",
        headers={"X-Telegram-Bot-Secret": INTERNAL_SECRET},
        timeout=15.0,
    )
    r.raise_for_status()
    body = r.json()
    return [int(x) for x in body.get("chat_ids", [])]


async def call_dispatch(client: httpx.AsyncClient, chat_id: int, text: str) -> str:
    url = f"{API_BASE}/api/telegram/internal/bot-dispatch"
    try:
        r = await client.post(
            url,
            headers={"X-Telegram-Bot-Secret": INTERNAL_SECRET},
            json={"chat_id": chat_id, "text": text},
            timeout=45.0,
        )
    except httpx.ConnectError as e:
        log.error("bot-dispatch connect failed url=%s err=%s (в Docker задайте API_BASE_URL на хост бэкенда, напр. http://backend:8000)", url, e)
        raise
    if r.status_code >= 400:
        log.error(
            "bot-dispatch HTTP %s url=%s body=%s",
            r.status_code,
            url,
            (r.text or "")[:2000],
        )
    r.raise_for_status()
    body = r.json()
    return str(body.get("text", ""))


async def fetch_timer(client: httpx.AsyncClient) -> tuple[str | None, float | None]:
    r = await client.get(f"{API_BASE}/api/timer/", timeout=15.0)
    r.raise_for_status()
    body = r.json()
    deadline = body.get("deadline_at")
    rem = body.get("seconds_remaining")
    if rem is not None:
        rem = float(rem)
    return (deadline if isinstance(deadline, str) else None, rem)


async def bind_user(client: httpx.AsyncClient, code: str, chat_id: int, username: str | None) -> None:
    r = await client.post(
        f"{API_BASE}/api/telegram/bind-bot",
        headers={"X-Telegram-Bot-Secret": INTERNAL_SECRET},
        json={"code": code, "chat_id": chat_id, "tg_username": username},
        timeout=15.0,
    )
    if r.status_code >= 400:
        raise RuntimeError(r.text)
    await send_text(
        client,
        chat_id,
        "Аккаунт на сайте привязан. Напоминания о таймере — автоматически. Команды: /help",
    )


async def handle_updates(client: httpx.AsyncClient, offset: int | None) -> int | None:
    params: dict[str, Any] = {"timeout": 50}
    if offset is not None:
        params["offset"] = offset
    r = await client.get(tg_url("getUpdates"), params=params, timeout=60.0)
    r.raise_for_status()
    data = r.json()
    if not data.get("ok"):
        return offset
    next_offset = offset
    for u in data.get("result", []):
        next_offset = int(u["update_id"]) + 1
        msg = u.get("message") or u.get("edited_message")
        if not msg:
            continue
        chat = msg.get("chat") or {}
        chat_id = int(chat.get("id"))
        from_user = msg.get("from") or {}
        username = from_user.get("username")
        text = (msg.get("text") or "").strip()
        if text.startswith("/start"):
            parts = text.split(maxsplit=1)
            code = parts[1].strip() if len(parts) > 1 else ""
            if code:
                try:
                    await bind_user(client, code, chat_id, username)
                except Exception as e:
                    log.exception("bind failed")
                    await send_text(client, chat_id, f"Не удалось привязать аккаунт: {e}")
                continue
            try:
                reply = await call_dispatch(client, chat_id, "/start")
                await send_text(client, chat_id, reply)
            except Exception:
                log.exception("dispatch /start failed")
                await send_text(
                    client,
                    chat_id,
                    "Откройте бота с сайта HackSwipe (кнопка «TG уведомления») — "
                    "там выдаётся персональная ссылка с кодом для /start.",
                )
            continue

        if text.startswith("/"):
            try:
                reply = await call_dispatch(client, chat_id, text)
                await send_text(client, chat_id, reply)
            except Exception:
                log.exception("dispatch failed")
                await send_text(client, chat_id, "Сервер временно недоступен. Повторите позже.")
    return next_offset


async def maybe_notify_timer(client: httpx.AsyncClient) -> None:
    global STATE
    now = time.monotonic()
    if now - STATE.last_timer_fetch < 12.0:
        return
    STATE.last_timer_fetch = now
    try:
        deadline, rem = await fetch_timer(client)
    except Exception:
        log.warning("timer fetch failed", exc_info=True)
        return

    key = deadline or "none"
    if key != STATE.deadline_key:
        prev_fetch = STATE.last_timer_fetch
        STATE = NotifyState(deadline_key=key, last_timer_fetch=prev_fetch)

    if deadline is None or rem is None:
        return

    chats: list[int] | None = None

    if rem > 0.0:
        if rem <= 3600.0 and not STATE.sent_60:
            STATE.sent_60 = True
            chats = await fetch_recipients(client)
            for cid in chats:
                try:
                    await send_text(client, cid, "До конца хакатона по таймеру осталось меньше часа.")
                except Exception:
                    log.warning("send 60m failed chat=%s", cid, exc_info=True)

        if rem <= 900.0 and not STATE.sent_15:
            STATE.sent_15 = True
            chats = chats or await fetch_recipients(client)
            for cid in chats:
                try:
                    await send_text(client, cid, "До конца хакатона по таймеру осталось меньше 15 минут.")
                except Exception:
                    log.warning("send 15m failed chat=%s", cid, exc_info=True)

    if rem <= 0.0 and not STATE.sent_end:
        STATE.sent_end = True
        chats = chats or await fetch_recipients(client)
        for cid in chats:
            try:
                await send_text(client, cid, "Хакатон завершён по таймеру. Удачи командам!")
            except Exception:
                log.warning("send end failed chat=%s", cid, exc_info=True)


async def main_loop() -> None:
    offset: int | None = None
    async with httpx.AsyncClient() as client:
        await tg_post(client, "deleteWebhook", {"drop_pending_updates": False})
        log.info("HackSwipeBot started, API_BASE=%s", API_BASE)
        while True:
            try:
                await maybe_notify_timer(client)
                offset = await handle_updates(client, offset)
            except (httpx.HTTPError, asyncio.TimeoutError) as e:
                log.warning("loop error: %s", e)
                await asyncio.sleep(2.0)
            except Exception:
                log.exception("fatal iteration")
                await asyncio.sleep(3.0)


if __name__ == "__main__":
    asyncio.run(main_loop())
