"""Team invite, repo/screenshots, team_members.

Revision ID: 0002_team_fields
Revises: 0001_initial
Create Date: 2026-04-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_team_fields"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("teams", sa.Column("invite_code", sa.String(length=16), nullable=True))
    op.add_column("teams", sa.Column("repo_url", sa.String(length=1024), nullable=True))
    op.add_column("teams", sa.Column("screenshots_json", sa.Text(), nullable=True))

    op.execute(
        sa.text(
            "UPDATE teams SET invite_code = substr(md5(random()::text || id::text), 1, 10) "
            "WHERE invite_code IS NULL"
        )
    )
    op.alter_column("teams", "invite_code", nullable=False)
    op.create_unique_constraint("uq_teams_invite_code", "teams", ["invite_code"])

    op.create_table(
        "team_members",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("team_id", "user_id", name="uq_team_members_team_user"),
        sa.UniqueConstraint("user_id", name="uq_team_members_one_team_per_user"),
    )


def downgrade() -> None:
    op.drop_table("team_members")
    op.drop_index(op.f("ix_teams_invite_code"), table_name="teams")
    op.drop_constraint("uq_teams_invite_code", "teams", type_="unique")
    op.drop_column("teams", "screenshots_json")
    op.drop_column("teams", "repo_url")
    op.drop_column("teams", "invite_code")
