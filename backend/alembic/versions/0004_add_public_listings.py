"""Add scope versions, public listings, and visibility audit tables."""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0004_add_public_listings"
down_revision: str | None = "0003_add_service_expenses"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Create listing projection, scope version, and visibility audit tables."""

    op.create_table(
        "scope_versions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("expense_id", sa.String(length=36), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("service_area", sa.String(length=255), nullable=True),
        sa.Column("location_approximate", sa.String(length=255), nullable=True),
        sa.Column("square_footage", sa.Integer(), nullable=True),
        sa.Column("visit_frequency", sa.String(length=64), nullable=True),
        sa.Column("bathroom_count", sa.Integer(), nullable=True),
        sa.Column("required_tasks", sa.Text(), nullable=True),
        sa.Column("supplies_included", sa.Boolean(), nullable=True),
        sa.Column("equipment_included", sa.Boolean(), nullable=True),
        sa.Column("taxes_included", sa.Boolean(), nullable=True),
        sa.Column("insurance_required", sa.String(length=255), nullable=True),
        sa.Column("start_date", sa.String(length=64), nullable=True),
        sa.Column("minimum_term", sa.String(length=255), nullable=True),
        sa.Column("cancellation_terms", sa.Text(), nullable=True),
        sa.Column("current_price_minor", sa.Integer(), nullable=True),
        sa.Column("current_price_currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("billing_cadence", sa.String(length=32), nullable=True),
        sa.Column("challenge_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("incumbent_vendor_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["expense_id"], ["service_expenses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scope_versions_expense_id", "scope_versions", ["expense_id"])

    op.create_table(
        "public_listings",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("expense_id", sa.String(length=36), nullable=False),
        sa.Column("scope_version_id", sa.String(length=36), nullable=False),
        sa.Column("owner_account_id", sa.String(length=64), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("scope_summary", sa.Text(), nullable=False),
        sa.Column("price_minor", sa.Integer(), nullable=False),
        sa.Column("price_currency", sa.String(length=8), nullable=False),
        sa.Column("billing_cadence", sa.String(length=32), nullable=False),
        sa.Column("service_area_approximate", sa.String(length=255), nullable=False),
        sa.Column("bidding_mode", sa.String(length=16), nullable=False, server_default="sealed"),
        sa.Column("challenge_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("show_incumbent_vendor", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("incumbent_vendor_name", sa.String(length=255), nullable=True),
        sa.Column("show_exact_address", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("visibility", sa.String(length=32), nullable=False, server_default="private"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["expense_id"], ["service_expenses.id"]),
        sa.ForeignKeyConstraint(["scope_version_id"], ["scope_versions.id"]),
        sa.ForeignKeyConstraint(["owner_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("expense_id", name="uq_public_listing_expense_id"),
    )
    op.create_index("ix_public_listings_owner_account_id", "public_listings", ["owner_account_id"])

    op.create_table(
        "visibility_audits",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("expense_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=64), nullable=False),
        sa.Column("previous_state", sa.String(length=32), nullable=False),
        sa.Column("new_state", sa.String(length=32), nullable=False),
        sa.Column("public_payload_snapshot", sa.Text(), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_visibility_audits_expense_id", "visibility_audits", ["expense_id"])


def downgrade() -> None:
    """Drop listing projection, scope version, and visibility audit tables."""

    op.drop_index("ix_visibility_audits_expense_id", table_name="visibility_audits")
    op.drop_table("visibility_audits")
    op.drop_index("ix_public_listings_owner_account_id", table_name="public_listings")
    op.drop_table("public_listings")
    op.drop_index("ix_scope_versions_expense_id", table_name="scope_versions")
    op.drop_table("scope_versions")
