"""Add challenges and challenge revision tables for marketplace offers."""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0005_add_challenges"
down_revision: str | None = "0004_add_public_listings"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Create challenge and challenge revision tables."""

    op.create_table(
        "challenges",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("scope_version_id", sa.String(length=36), nullable=False),
        sa.Column("challenger_account_id", sa.String(length=64), nullable=False),
        sa.Column("bidding_mode_at_submission", sa.String(length=16), nullable=False),
        sa.Column("price_minor", sa.Integer(), nullable=False),
        sa.Column("price_currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("billing_frequency", sa.String(length=32), nullable=False),
        sa.Column("scope_included", sa.Text(), nullable=False),
        sa.Column("scope_excluded", sa.Text(), nullable=False),
        sa.Column("scope_extras", sa.Text(), nullable=False),
        sa.Column("setup_fee_minor", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("taxes_included", sa.Boolean(), nullable=True),
        sa.Column("supplies_included", sa.Boolean(), nullable=True),
        sa.Column("minimum_term", sa.String(length=255), nullable=True),
        sa.Column("other_conditions", sa.Text(), nullable=True),
        sa.Column("message_to_owner", sa.Text(), nullable=True),
        sa.Column("availability", sa.String(length=255), nullable=True),
        sa.Column("offer_expiry", sa.DateTime(timezone=True), nullable=True),
        sa.Column("site_visit_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("provenance", sa.String(length=64), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revised_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["listing_id"], ["public_listings.id"]),
        sa.ForeignKeyConstraint(["scope_version_id"], ["scope_versions.id"]),
        sa.ForeignKeyConstraint(["challenger_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_challenges_listing_id", "challenges", ["listing_id"])
    op.create_index("ix_challenges_challenger_account_id", "challenges", ["challenger_account_id"])

    op.create_table(
        "challenge_revisions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("challenge_id", sa.String(length=36), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("bidding_mode_at_revision", sa.String(length=16), nullable=False),
        sa.Column("price_minor", sa.Integer(), nullable=False),
        sa.Column("price_currency", sa.String(length=8), nullable=False),
        sa.Column("billing_frequency", sa.String(length=32), nullable=False),
        sa.Column("scope_included", sa.Text(), nullable=False),
        sa.Column("scope_excluded", sa.Text(), nullable=False),
        sa.Column("scope_extras", sa.Text(), nullable=False),
        sa.Column("setup_fee_minor", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("taxes_included", sa.Boolean(), nullable=True),
        sa.Column("supplies_included", sa.Boolean(), nullable=True),
        sa.Column("minimum_term", sa.String(length=255), nullable=True),
        sa.Column("other_conditions", sa.Text(), nullable=True),
        sa.Column("message_to_owner", sa.Text(), nullable=True),
        sa.Column("availability", sa.String(length=255), nullable=True),
        sa.Column("offer_expiry", sa.DateTime(timezone=True), nullable=True),
        sa.Column("site_visit_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("provenance", sa.String(length=64), nullable=False),
        sa.Column("revised_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["challenge_id"], ["challenges.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_challenge_revisions_challenge_id", "challenge_revisions", ["challenge_id"])


def downgrade() -> None:
    """Drop challenge and challenge revision tables."""

    op.drop_index("ix_challenge_revisions_challenge_id", table_name="challenge_revisions")
    op.drop_table("challenge_revisions")
    op.drop_index("ix_challenges_challenger_account_id", table_name="challenges")
    op.drop_index("ix_challenges_listing_id", table_name="challenges")
    op.drop_table("challenges")
