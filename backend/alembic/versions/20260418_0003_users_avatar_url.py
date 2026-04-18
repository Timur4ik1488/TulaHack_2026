"""Add users.avatar_url.

Revision ID: 0003_user_avatar
Revises: 0002_team_fields
Create Date: 2026-04-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_user_avatar"
down_revision: Union[str, None] = "0002_team_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
