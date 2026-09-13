"""Add the outbound invitation tables and account contact emails (roadmap 08).

The invitations table from 0007 was an unused stub: its API only ever returned 501, so no row was
ever written. It is dropped and recreated with the approval link, stored message, delivery state,
and the (listing_id, provider_candidate_id) unique constraint that makes sending idempotent.
Downgrade restores the stub exactly as 0007 created it, and discards every outreach record.
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0012_outreach"
down_revision: str | None = "0011_public_scope_requirements"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Replace the invitation stub and create candidates, runs, approvals, opt-outs, and the sandbox outbox."""

    op.drop_index("ix_invitations_listing_id", table_name="invitations")
    op.drop_table("invitations")

    _create_provider_candidates()
    _create_discovery_runs()
    _create_invitation_approvals()
    _create_invitations()
    op.create_table(
        "outreach_suppressions",
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("opted_out_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("via", sa.String(length=32), nullable=False, server_default="opt_out_link"),
        sa.PrimaryKeyConstraint("email"),
    )
    op.create_table(
        "sandbox_outbox",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("invitation_id", sa.String(length=36), nullable=False),
        sa.Column("to_email", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=False),
        sa.Column("headers_json", sa.Text(), nullable=False),
        sa.Column("stored_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["invitation_id"], ["invitations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("invitation_id"),
    )
    # batch_alter_table so the column add stays reversible on SQLite, which can't drop columns in place.
    with op.batch_alter_table("accounts") as batch:
        batch.add_column(sa.Column("contact_email", sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Drop every outreach table and the contact email column, then restore the 0007 invitation stub."""

    with op.batch_alter_table("accounts") as batch:
        batch.drop_column("contact_email")
    op.drop_table("sandbox_outbox")
    op.drop_table("outreach_suppressions")
    op.drop_index("ix_invitations_state", table_name="invitations")
    op.drop_index("ix_invitations_listing_id", table_name="invitations")
    op.drop_table("invitations")
    op.drop_index("ix_invitation_approvals_listing_id", table_name="invitation_approvals")
    op.drop_table("invitation_approvals")
    op.drop_index("ix_discovery_runs_listing_id", table_name="discovery_runs")
    op.drop_table("discovery_runs")
    op.drop_index("ix_provider_candidates_listing_id", table_name="provider_candidates")
    op.drop_table("provider_candidates")

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


def _create_provider_candidates() -> None:
    op.create_table(
        "provider_candidates",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("owner_account_id", sa.String(length=64), nullable=False),
        sa.Column("business_name", sa.String(length=255), nullable=False),
        sa.Column("website_url", sa.String(length=1024), nullable=True),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column("contact_email_source_url", sa.String(length=1024), nullable=True),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("service_area", sa.String(length=255), nullable=True),
        sa.Column("capability_summary", sa.Text(), nullable=True),
        sa.Column("origin", sa.String(length=32), nullable=False),
        sa.Column("discovery_source", sa.String(length=32), nullable=False),
        sa.Column("provenance", sa.String(length=32), nullable=False),
        sa.Column("source_urls", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dedupe_key", sa.String(length=255), nullable=False),
        sa.Column("contacted_off_platform", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("opt_out_token", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["public_listings.id"]),
        sa.ForeignKeyConstraint(["owner_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id", "dedupe_key", name="uq_provider_candidate_listing_dedupe"),
        sa.UniqueConstraint("opt_out_token"),
    )
    op.create_index("ix_provider_candidates_listing_id", "provider_candidates", ["listing_id"])


def _create_discovery_runs() -> None:
    op.create_table(
        "discovery_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("ran_by_account_id", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("queries", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("found_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("dropped_aggregator_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("merged_duplicate_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("new_candidate_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ran_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["public_listings.id"]),
        sa.ForeignKeyConstraint(["ran_by_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_discovery_runs_listing_id", "discovery_runs", ["listing_id"])


def _create_invitation_approvals() -> None:
    op.create_table(
        "invitation_approvals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("approved_by_account_id", sa.String(length=64), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("template_version", sa.String(length=32), nullable=False),
        sa.Column("message_hash", sa.String(length=64), nullable=False),
        sa.Column("recipients", sa.Text(), nullable=False),
        sa.Column("listing_url", sa.String(length=1024), nullable=False),
        sa.Column("listing_terms_hash", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["public_listings.id"]),
        sa.ForeignKeyConstraint(["approved_by_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id", "message_hash", name="uq_invitation_approval_listing_hash"),
    )
    op.create_index("ix_invitation_approvals_listing_id", "invitation_approvals", ["listing_id"])


def _create_invitations() -> None:
    op.create_table(
        "invitations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("provider_candidate_id", sa.String(length=36), nullable=False),
        sa.Column("approval_id", sa.String(length=36), nullable=False),
        sa.Column("owner_account_id", sa.String(length=64), nullable=False),
        sa.Column("recipient_name", sa.String(length=255), nullable=False),
        sa.Column("recipient_email", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=False),
        sa.Column("headers_json", sa.Text(), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False, server_default="queued"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["public_listings.id"]),
        sa.ForeignKeyConstraint(["provider_candidate_id"], ["provider_candidates.id"]),
        sa.ForeignKeyConstraint(["approval_id"], ["invitation_approvals.id"]),
        sa.ForeignKeyConstraint(["owner_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id", "provider_candidate_id", name="uq_invitation_listing_candidate"),
        sa.UniqueConstraint("listing_id", "recipient_email", name="uq_invitation_listing_recipient"),
    )
    op.create_index("ix_invitations_listing_id", "invitations", ["listing_id"])
    op.create_index("ix_invitations_state", "invitations", ["state"])
