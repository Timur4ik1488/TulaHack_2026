"""hackathon_timer: запоминаем длительность последнего старта (минуты).

Revision ID: 0006_timer_last_duration
Revises: 0005_cases_tg
Create Date: 2026-04-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_timer_last_duration"
down_revision: Union[str, None] = "0005_cases_tg"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "hackathon_timer",
        sa.Column("last_duration_minutes", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("hackathon_timer", "last_duration_minutes")
