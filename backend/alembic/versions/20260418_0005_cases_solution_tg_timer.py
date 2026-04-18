"""Cases, team solution URL, telegram tables, hackathon_timer, sympathy in scoring prep.

Revision ID: 0005_cases_tg
Revises: 0004_sympathy_votes
Create Date: 2026-04-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_cases_tg"
down_revision: Union[str, None] = "0004_sympathy_votes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS hackathon_timer (
            id INTEGER PRIMARY KEY,
            deadline_at TIMESTAMPTZ NULL
        );
        """
    )
    op.execute(
        "ALTER TABLE hackathon_timer ADD COLUMN IF NOT EXISTS ended_event_sent BOOLEAN "
        "NOT NULL DEFAULT false"
    )
    op.execute(
        "INSERT INTO hackathon_timer (id, deadline_at, ended_event_sent) "
        "VALUES (1, NULL, false) ON CONFLICT (id) DO NOTHING"
    )

    op.add_column(
        "teams",
        sa.Column("solution_submission_url", sa.String(length=2048), nullable=True),
    )

    op.create_table(
        "project_cases",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ordinal", name="uq_project_cases_ordinal"),
    )

    op.create_table(
        "project_case_experts",
        sa.Column("case_id", sa.Integer(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["project_cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("case_id", "user_id", name="pk_case_expert"),
    )

    op.create_table(
        "project_case_teams",
        sa.Column("case_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["project_cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("case_id", "team_id", name="pk_case_team"),
        sa.UniqueConstraint("team_id", name="uq_project_case_teams_team"),
    )

    op.create_table(
        "tg_link_codes",
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("code"),
    )

    op.create_table(
        "tg_subscribers",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chat_id", sa.BigInteger(), nullable=False),
        sa.Column("tg_username", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("tg_subscribers")
    op.drop_table("tg_link_codes")
    op.drop_table("project_case_teams")
    op.drop_table("project_case_experts")
    op.drop_table("project_cases")
    op.drop_column("teams", "solution_submission_url")
    op.execute("ALTER TABLE hackathon_timer DROP COLUMN IF EXISTS ended_event_sent")
