"""Add the outbound invitation stub table."""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0007_add_invitations"
down_revision: str | None = "0006_add_challenger_evidence"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Create the invitations table for the secondary-path stub."""

    op.create_table(
        "invitations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("recipient_name", sa.String(length=255), nullable=False),
        sa.Column("recipient_email", sa.String(length=255), nullable=False),
        sa.Column("message_body", sa.Text(), nullable=True),
        sa.Column("delivery_state", sa.String(length=64), nullable=False, server_default="not_implemented"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["public_listings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invitations_listing_id", "invitations", ["listing_id"])


def downgrade() -> None:
    """Drop the invitation stub table."""

    op.drop_index("ix_invitations_listing_id", table_name="invitations")
    op.drop_table("invitations")
