"""Create the accounts table used by the seeded demo switcher."""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0001_create_accounts"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Create the accounts table for demo identities."""

    op.create_table(
        "accounts",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("handle", sa.String(length=120), nullable=False),
        sa.Column("business_name", sa.String(length=255), nullable=False),
        sa.Column("service_area", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("handle"),
    )


def downgrade() -> None:
    """Drop the accounts table."""

    op.drop_table("accounts")
