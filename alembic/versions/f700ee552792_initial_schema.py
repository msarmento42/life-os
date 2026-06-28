"""initial_schema — baseline checkpoint

This is a no-op baseline migration. The database already has all tables from
create_all() and the legacy _run_migrations() pattern. Alembic is being
introduced here to track future schema changes going forward.

To apply: alembic stamp head  (marks DB as already at this revision)
Future changes: alembic revision --autogenerate -m "description"

Revision ID: f700ee552792
Revises:
Create Date: 2026-06-28 15:03:51.885936

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f700ee552792'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline migration — database already exists from create_all().
    # No DDL changes: this revision just establishes the Alembic tracking baseline.
    pass


def downgrade() -> None:
    # No-op: this is the initial baseline, nothing to roll back.
    pass
