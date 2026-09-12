"""Add the vendor alias dismissal table for owner-rejected merge suggestions."""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0008_add_vendor_alias_dismissals"
down_revision: str | None = "0007_add_invitations"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Create the vendor alias dismissal table."""

    op.create_table(
        "vendor_alias_dismissals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_account_id", sa.String(length=64), nullable=False),
        sa.Column("alias_vendor", sa.String(length=255), nullable=False),
        sa.Column("canonical_vendor", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "owner_account_id",
            "alias_vendor",
            "canonical_vendor",
            name="uq_vendor_alias_dismissal_pair",
        ),
    )
    op.create_index(
        "ix_vendor_alias_dismissals_owner_account_id",
        "vendor_alias_dismissals",
        ["owner_account_id"],
    )


def downgrade() -> None:
    """Drop the vendor alias dismissal table."""

    op.drop_index("ix_vendor_alias_dismissals_owner_account_id", table_name="vendor_alias_dismissals")
    op.drop_table("vendor_alias_dismissals")
