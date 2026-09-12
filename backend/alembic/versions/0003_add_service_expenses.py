"""Add service expense and vendor correction tables for the dashboard."""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0003_add_service_expenses"
down_revision: str | None = "0002_add_transactions"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Create service expense and vendor correction tables."""

    op.create_table(
        "service_expenses",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_account_id", sa.String(length=64), nullable=False),
        sa.Column("normalized_vendor", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=True),
        sa.Column("cadence", sa.String(length=32), nullable=False),
        sa.Column("recurrence_confidence", sa.Float(), nullable=False),
        sa.Column("amount_minor_per_period", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("annualized_amount_minor", sa.Integer(), nullable=False),
        sa.Column("first_seen", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_count", sa.Integer(), nullable=False),
        sa.Column("is_eligible", sa.Boolean(), nullable=False),
        sa.Column("eligibility_reason", sa.String(length=255), nullable=False),
        sa.Column("is_publishable", sa.Boolean(), nullable=False),
        sa.Column("visibility", sa.String(length=32), nullable=False, server_default="private"),
        sa.Column("owner_corrected_vendor", sa.String(length=255), nullable=True),
        sa.Column("owner_corrected_category", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["owner_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_account_id", "normalized_vendor", name="uq_service_expense_owner_vendor"),
    )
    op.create_index("ix_service_expenses_owner_account_id", "service_expenses", ["owner_account_id"])

    op.create_table(
        "vendor_corrections",
        sa.Column("id", sa.String(length=120), nullable=False),
        sa.Column("owner_account_id", sa.String(length=64), nullable=False),
        sa.Column("raw_description_pattern", sa.String(length=255), nullable=False),
        sa.Column("corrected_vendor", sa.String(length=255), nullable=True),
        sa.Column("corrected_category", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["owner_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "owner_account_id",
            "raw_description_pattern",
            name="uq_vendor_correction_owner_pattern",
        ),
    )


def downgrade() -> None:
    """Drop service expense and vendor correction tables."""

    op.drop_table("vendor_corrections")
    op.drop_index("ix_service_expenses_owner_account_id", table_name="service_expenses")
    op.drop_table("service_expenses")
