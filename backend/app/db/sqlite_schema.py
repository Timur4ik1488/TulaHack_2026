"""Доп. шаги для старой SQLite: metadata.create_all не делает ALTER TABLE."""

from __future__ import annotations

import secrets
from typing import Set

from sqlalchemy import text
from sqlalchemy.engine import Connection


def upgrade_sqlite_schema(connection: Connection) -> None:
    cols = {row[1] for row in connection.execute(text("PRAGMA table_info(teams)")).fetchall()}

    if "invite_code" not in cols:
        connection.execute(text("ALTER TABLE teams ADD COLUMN invite_code VARCHAR(16)"))
    if "repo_url" not in cols:
        connection.execute(text("ALTER TABLE teams ADD COLUMN repo_url VARCHAR(1024)"))
    if "screenshots_json" not in cols:
        connection.execute(text("ALTER TABLE teams ADD COLUMN screenshots_json TEXT"))

    cols = {row[1] for row in connection.execute(text("PRAGMA table_info(teams)")).fetchall()}
    if "invite_code" not in cols:
        return

    existing: Set[str] = set()
    for (c,) in connection.execute(
        text("SELECT invite_code FROM teams WHERE invite_code IS NOT NULL AND TRIM(invite_code) != ''")
    ).fetchall():
        existing.add(str(c))

    for (tid,) in connection.execute(
        text("SELECT id FROM teams WHERE invite_code IS NULL OR TRIM(invite_code) = ''")
    ).fetchall():
        for _ in range(64):
            code = secrets.token_hex(4)[:10]
            if code not in existing:
                connection.execute(
                    text("UPDATE teams SET invite_code = :code WHERE id = :id"),
                    {"code": code, "id": tid},
                )
                existing.add(code)
                break

    connection.execute(
        text("CREATE UNIQUE INDEX IF NOT EXISTS uq_teams_invite_code ON teams(invite_code)")
    )
