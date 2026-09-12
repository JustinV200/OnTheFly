"""Add company-scoped Stripe sandbox connections."""

from alembic import op
import sqlalchemy as sa

revision = "0008_financial_connections"
down_revision = "0007_add_invitations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create connection metadata without changing expenses."""
    op.create_table(
        "financial_connections",
        sa.Column(
            "owner_account_id",
            sa.String(64),
            sa.ForeignKey("accounts.id"),
            primary_key=True,
        ),
        sa.Column("customer_id", sa.String(128), nullable=False, unique=True),
        sa.Column("session_id", sa.String(128)),
        sa.Column("bank_account_id", sa.String(128), unique=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    """Remove connection metadata."""
    op.drop_table("financial_connections")
