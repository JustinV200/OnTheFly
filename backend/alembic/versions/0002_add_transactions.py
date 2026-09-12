"""Add the transactions table for imported financial records."""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0002_add_transactions"
down_revision: str | None = "0001_create_accounts"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Create the private transactions table and related indexes."""

    op.create_table(
        "transactions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_account_id", sa.String(length=64), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_account_id", sa.String(length=128), nullable=False),
        sa.Column("provider_transaction_id", sa.String(length=128), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("raw_description", sa.String(length=255), nullable=False),
        sa.Column("normalized_vendor", sa.String(length=255), nullable=True),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("direction", sa.String(length=16), nullable=False),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=True),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("counterparty", sa.String(length=255), nullable=True),
        sa.Column("raw_payload", sa.Text(), nullable=False),
        sa.Column("is_excluded", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("excluded_reason", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider",
            "provider_account_id",
            "provider_transaction_id",
            name="uq_transaction_provider_record",
        ),
    )
    op.create_index("ix_transactions_owner_account_id", "transactions", ["owner_account_id"])


def downgrade() -> None:
    """Drop the transactions table and its indexes."""

    op.drop_index("ix_transactions_owner_account_id", table_name="transactions")
    op.drop_table("transactions")
