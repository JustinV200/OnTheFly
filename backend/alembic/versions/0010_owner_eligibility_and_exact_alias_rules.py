"""Add the owner's durable not-publishable mark, and the match mode that lets exact rules match one descriptor.

Existing rules were all owner renames, so the match-mode server default keeps them whole-word ("word").
Existing expenses carry no mark, so owner_marked_ineligible defaults to false; a mark set before this
migration was already lost on the next dashboard sync, so there is nothing to backfill.
The revision id is shorter than this file's name: Alembic's alembic_version.version_num column
is VARCHAR(32), and Postgres rejects a longer id when it records the upgrade.
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0010_eligibility_exact_alias"
down_revision: str | None = "0009_add_vendor_alias_dismissals"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Add vendor_corrections.match_mode ("word") and service_expenses.owner_marked_ineligible (false)."""

    op.add_column(
        "vendor_corrections",
        sa.Column("match_mode", sa.String(length=16), nullable=False, server_default="word"),
    )
    op.add_column(
        "service_expenses",
        sa.Column("owner_marked_ineligible", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    """Drop both columns; every rule reverts to whole-word matching and owner marks are discarded."""

    op.drop_column("service_expenses", "owner_marked_ineligible")
    op.drop_column("vendor_corrections", "match_mode")
