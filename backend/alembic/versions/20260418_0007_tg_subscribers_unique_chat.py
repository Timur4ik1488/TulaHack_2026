"""tg_subscribers: убрать дубликаты chat_id, уникальный индекс на chat_id.

Revision ID: 0007_tg_subscribers_unique_chat
Revises: 0006_timer_last_duration
Create Date: 2026-04-18

"""

from typing import Sequence, Union

from alembic import op

revision: str = "0007_tg_subscribers_unique_chat"
down_revision: Union[str, None] = "0006_timer_last_duration"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Оставляем по одному ряду на chat_id (самый свежий по created_at).
    op.execute(
        """
        DELETE FROM tg_subscribers t
        WHERE t.ctid NOT IN (
            SELECT DISTINCT ON (chat_id) ctid
            FROM tg_subscribers
            ORDER BY chat_id, created_at DESC NULLS LAST, user_id
        );
        """
    )
    op.create_unique_constraint(
        "uq_tg_subscribers_chat_id",
        "tg_subscribers",
        ["chat_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_tg_subscribers_chat_id", "tg_subscribers", type_="unique")
