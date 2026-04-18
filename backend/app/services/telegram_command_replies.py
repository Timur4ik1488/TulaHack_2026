"""Текстовые ответы Telegram-бота: данные из БД, без Telegram SDK."""

from __future__ import annotations

import datetime as dt
import textwrap
import uuid
from typing import Any, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.timer_helpers import compute_timer_client_state
from app.models.criterion import Criterion
from app.models.hackathon_timer import HackathonTimer
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.tg_account import TgSubscriber
from app.models.user import User, UserRole
from app.scoring import leaderboard_totals

TIMER_ROW_ID = 1


def _site() -> str:
    return (settings.PUBLIC_SITE_URL or "http://127.0.0.1:5173").rstrip("/")


def _parse_cmd(text: str) -> Tuple[str, List[str]]:
    t = (text or "").strip()
    if not t.startswith("/"):
        return ("", [])
    parts = t.split()
    cmd = parts[0].split("@", 1)[0].lower()
    return cmd, parts[1:]


async def _user_for_chat(db: AsyncSession, chat_id: int) -> Optional[User]:
    """Один Telegram-чат → один аккаунт; при дубликатах в БД берём самую свежую запись."""
    r = await db.execute(
        select(TgSubscriber)
        .where(TgSubscriber.chat_id == chat_id)
        .order_by(TgSubscriber.created_at.desc())
        .limit(1)
    )
    sub = r.scalars().first()
    if not sub:
        return None
    return await db.get(User, sub.user_id)


async def _participant_team_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[int]:
    r = await db.execute(select(TeamMember.team_id).where(TeamMember.user_id == user_id))
    row = r.first()
    return int(row[0]) if row else None


def _rank_for_leaderboard(rows: List[dict[str, Any]], team_id: int) -> tuple[int | None, dict[str, Any] | None]:
    rank = 0
    prev: float | None = None
    found: dict[str, Any] | None = None
    found_rank: int | None = None
    for i, r in enumerate(rows):
        pct = float(r["total_percent"])
        if prev is None or pct != prev:
            rank = i + 1
        prev = pct
        if int(r["team_id"]) == team_id:
            found_rank = rank
            found = r
    return found_rank, found


def _format_team_card(team: Team) -> str:
    base = _site()
    lines = [
        f"📇 Команда #{team.id} · {team.name}",
    ]
    if team.case_number is not None:
        lines.append(f"Кейс: №{team.case_number}")
    else:
        lines.append("Кейс: не назначен")
    desc = (team.description or "").strip()
    if desc:
        lines.append("Описание:\n" + textwrap.shorten(desc, width=900, placeholder="…"))
    if team.contact:
        lines.append(f"Контакт: {team.contact}")
    if team.repo_url:
        lines.append(f"Репозиторий: {team.repo_url}")
    if team.solution_submission_url:
        lines.append(f"Решение: {team.solution_submission_url}")
    lines.append(f"Публичная карточка: {base}/teams/{team.id}")
    return "\n".join(lines)


async def compose_telegram_bot_reply(db: AsyncSession, chat_id: int, text: str) -> str:
    cmd, args = _parse_cmd(text)
    if not cmd:
        return "Отправьте команду с / в начале. Список: /help (нужна привязка к сайту)."

    site = _site()

    if cmd in ("/deadline", "/timer"):
        row = await db.get(HackathonTimer, TIMER_ROW_ID)
        if not row or not row.deadline_at:
            return "Серверный таймер сейчас не запущен."
        now = dt.datetime.now(dt.timezone.utc)
        _open, _passed, rem = compute_timer_client_state(row.deadline_at, now)
        if rem is None or rem <= 0:
            return "Дедлайн по таймеру уже прошёл."
        m = int(rem // 60)
        s = int(rem % 60)
        return f"До дедлайна: {m}:{s:02d} (время сервера)."

    user = await _user_for_chat(db, chat_id)

    auth_cmds = {
        "/start",
        "/help",
        "/mystatus",
        "/scores",
        "/site",
        "/myteams",
        "/criteria",
        "/admin_teams",
        "/admin_team",
        "/broadcast",
        "/results",
        "/alert",
        "/notify_on",
        "/notify_off",
    }
    if cmd in auth_cmds and not user:
        return (
            "Аккаунт не привязан. На сайте HackSwipe нажмите «TG уведомления» "
            "и откройте бота по персональной ссылке (/start с кодом из ссылки)."
        )

    assert user is not None

    if cmd == "/start":
        return "\n".join(
            [
                f"Привет, {user.username}!",
                f"Роль: {user.role.value}",
                f"Сайт: {site}",
                "Список команд: /help",
            ]
        )

    if cmd == "/help":
        lines = ["HackSwipe — команды (действия на сайте):"]
        if user.role == UserRole.PARTICIPANT:
            lines += [
                "/mystatus — место и баллы команды",
                "/scores — топ команд",
                "/site — ссылки в кабинет",
            ]
        if user.role in (UserRole.EXPERT, UserRole.ADMIN):
            lines += ["/myteams — команды для оценки", "/criteria — критерии и веса"]
        if user.role == UserRole.ADMIN:
            lines += [
                "/admin_teams — список команд",
                "/admin_team <id> — «карточка» команды в чате",
                "/broadcast /results /alert — подсказки (массовые действия через сайт)",
            ]
        lines.append("/deadline и /timer — таймер (в боте работают и без привязки к сайту).")
        lines.append("Регистрация, оценки и правки — только в веб-интерфейсе.")
        return "\n".join(lines)

    if cmd == "/site":
        if user.role == UserRole.ADMIN:
            return f"Панель администратора: {site}/admin"
        if user.role == UserRole.EXPERT:
            return f"Оценка жюри: {site}/jury/teams"
        return f"Кабинет команды: {site}/team/profile"

    if cmd == "/scores":
        rows = await leaderboard_totals(db)
        rows.sort(key=lambda x: (-float(x["total_percent"]), str(x["team_name"])))
        lines = ["Топ команд (жюри + симпатии):"]
        for i, r in enumerate(rows[:20], start=1):
            sym = float(r.get("sympathy_bonus_percent", 0))
            lines.append(
                f"{i}. {r['team_name']} — {float(r['total_percent']):.2f}% "
                f"(жюри {float(r['jury_percent']):.2f}%, симп. +{sym:.2f}%)"
            )
        lines.append(f"Полный лидерборд: {site}/leaderboard")
        return "\n".join(lines)

    if cmd == "/mystatus":
        tid = await _participant_team_id(db, user.id)
        if not tid:
            return f"Вы не в составе команды. Регистрация: {site}/register"
        rows = await leaderboard_totals(db)
        rows.sort(key=lambda x: (-float(x["total_percent"]), str(x["team_name"])))
        rk, row = _rank_for_leaderboard(rows, tid)
        if not row or rk is None:
            return "Не удалось найти команду в рейтинге."
        team = await db.get(Team, tid)
        name = team.name if team else str(tid)
        sym_sum = int(row.get("sympathy_votes_sum", 0))
        bonus = float(row.get("sympathy_bonus_percent", 0))
        return "\n".join(
            [
                f"Команда «{name}»",
                f"Место в рейтинге: #{rk}",
                f"Жюри: {float(row['jury_percent']):.2f}%",
                f"Бонус симпатий: {bonus:.2f} п.п.",
                f"Сумма голосов (overall): {sym_sum:+d}",
                f"Итого: {float(row['total_percent']):.2f}%",
                f"Карточка: {site}/teams/{tid}",
            ]
        )

    if cmd == "/myteams":
        if user.role not in (UserRole.EXPERT, UserRole.ADMIN):
            return "Команда доступна экспертам и администраторам."
        r = await db.execute(select(Team).order_by(Team.id))
        teams = list(r.scalars())
        lines = [f"Команд: {len(teams)}. Оценка только на сайте.", ""]
        for t in teams[:35]:
            lines.append(f"#{t.id} {t.name}\n→ {site}/jury/score/{t.id}")
        if len(teams) > 35:
            lines.append(f"… и ещё {len(teams) - 35} (полный список на сайте).")
        return "\n".join(lines)

    if cmd == "/criteria":
        if user.role not in (UserRole.EXPERT, UserRole.ADMIN):
            return "Критерии доступны экспертам и администраторам."
        r = await db.execute(select(Criterion).order_by(Criterion.id))
        crits = list(r.scalars())
        if not crits:
            return "Критерии ещё не заданы. Админка: " + site + "/admin/criteria"
        lines = ["Критерии жюри:"]
        for c in crits:
            lines.append(f"· {c.name} — вес {float(c.weight):g}%, макс. {float(c.max_score):g} баллов")
        lines.append(f"Редактирование: {site}/admin/criteria")
        return "\n".join(lines)

    if cmd == "/admin_teams":
        if user.role != UserRole.ADMIN:
            return "Только для администратора."
        r = await db.execute(select(Team).order_by(Team.id))
        teams = list(r.scalars())
        lines = ["Команды (кратко). Карточка: /admin_team <id>", ""]
        for t in teams[:40]:
            cn = f", кейс №{t.case_number}" if t.case_number is not None else ""
            lines.append(f"#{t.id} — {t.name}{cn}")
        if len(teams) > 40:
            lines.append(f"… всего {len(teams)} команд.")
        return "\n".join(lines)

    if cmd == "/admin_team":
        if user.role != UserRole.ADMIN:
            return "Только для администратора."
        if not args:
            return f"Пример: /admin_team 3\nСписок: /admin_teams"
        try:
            tid = int(args[0])
        except ValueError:
            return "Укажите числовой id команды, например: /admin_team 3"
        team = await db.get(Team, tid)
        if not team:
            return "Команда с таким id не найдена."
        return _format_team_card(team)

    if cmd == "/broadcast":
        if user.role != UserRole.ADMIN:
            return "Только для администратора."
        return (
            "Массовая рассылка и шаблоны — в веб-интерфейсе:\n"
            f"{site}/admin/telegram-console\n"
            "Бот не меняет данные на сервере, только показывает информацию и напоминает."
        )

    if cmd == "/results":
        if user.role != UserRole.ADMIN:
            return f"Таблица результатов: {site}/leaderboard и {site}/podium"
        rows = await leaderboard_totals(db)
        rows.sort(key=lambda x: (-float(x["total_percent"]), str(x["team_name"])))
        lines = ["Итоговая таблица (текущие данные, админ):"]
        for i, r in enumerate(rows[:15], start=1):
            lines.append(f"{i}. {r['team_name']} — {float(r['total_percent']):.2f}%")
        lines.append(f"Подробнее: {site}/leaderboard · {site}/podium")
        return "\n".join(lines)

    if cmd == "/alert":
        if user.role != UserRole.ADMIN:
            return "Только для администратора."
        return (
            "Экстренные объявления участникам лучше дублировать с сайта и через рассылку:\n"
            f"{site}/admin/telegram-console"
        )

    if cmd in ("/notify_on", "/notify_off"):
        return (
            "Напоминания по таймеру приходят в привязанный чат автоматически. "
            "Отключение по шагам пока только через поддержку; основной канал — сайт."
        )

    return f"Неизвестная команда {cmd}. Введите /help."

