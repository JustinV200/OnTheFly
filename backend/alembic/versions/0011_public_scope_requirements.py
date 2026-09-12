"""Add the scored scope requirements to the stored public listing projection.

Existing rows are deliberately not backfilled from their scope versions: the supplies, equipment,
and taxes expectations were never in a payload an owner previewed, so they become public only when
the owner confirms scope again and publishes a preview that shows them.
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0011_public_scope_requirements"
down_revision: str | None = "0009_add_vendor_alias_dismissals"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Add nullable required tasks, visit frequency, and expectation columns to public listings."""

    op.add_column("public_listings", sa.Column("required_tasks", sa.Text(), nullable=True))
    op.add_column("public_listings", sa.Column("visit_frequency", sa.String(length=64), nullable=True))
    op.add_column("public_listings", sa.Column("supplies_included", sa.Boolean(), nullable=True))
    op.add_column("public_listings", sa.Column("equipment_included", sa.Boolean(), nullable=True))
    op.add_column("public_listings", sa.Column("taxes_included", sa.Boolean(), nullable=True))


def downgrade() -> None:
    """Drop the scope requirement columns from public listings."""

    # batch_alter_table so the drop also works on SQLite, which can't drop columns in place.
    with op.batch_alter_table("public_listings") as batch:
        batch.drop_column("taxes_included")
        batch.drop_column("equipment_included")
        batch.drop_column("supplies_included")
        batch.drop_column("visit_frequency")
        batch.drop_column("required_tasks")
