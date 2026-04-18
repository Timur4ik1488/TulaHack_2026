"""Колонка scores.jury_comment — короткий комментарий эксперта к критерию.

Revision ID: 0010_scores_jury_comment
Revises: 0009_hackathon_overview
Create Date: 2026-04-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_scores_jury_comment"
down_revision: Union[str, None] = "0009_hackathon_overview"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "scores",
        sa.Column("jury_comment", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("scores", "jury_comment")
