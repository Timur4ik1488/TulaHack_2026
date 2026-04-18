"""Audience sympathy votes (+1 / -1) per team and dimension.

Revision ID: 0004_sympathy_votes
Revises: 0003_user_avatar
Create Date: 2026-04-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_sympathy_votes"
down_revision: Union[str, None] = "0003_user_avatar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sympathy_votes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("dimension", sa.String(length=32), nullable=False),
        sa.Column("value", sa.SmallInteger(), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "team_id", "dimension", name="uq_sympathy_user_team_dim"),
    )


def downgrade() -> None:
    op.drop_table("sympathy_votes")
