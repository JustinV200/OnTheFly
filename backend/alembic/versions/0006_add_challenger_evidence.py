"""Add stored challenger evidence bundles for owner review."""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0006_add_challenger_evidence"
down_revision: str | None = "0005_add_challenges"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Create the challenger_evidence table."""

    op.create_table(
        "challenger_evidence",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("challenge_id", sa.String(length=36), nullable=False),
        sa.Column("challenger_account_id", sa.String(length=64), nullable=False),
        sa.Column("platform_check", sa.Text(), nullable=False),
        sa.Column("identity_check", sa.Text(), nullable=False),
        sa.Column("registry_check", sa.Text(), nullable=False),
        sa.Column("last_updated", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["challenge_id"], ["challenges.id"]),
        sa.ForeignKeyConstraint(["challenger_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_challenger_evidence_challenge_id", "challenger_evidence", ["challenge_id"])
    op.create_index("ix_challenger_evidence_challenger_account_id", "challenger_evidence", ["challenger_account_id"])


def downgrade() -> None:
    """Drop the challenger_evidence table."""

    op.drop_index("ix_challenger_evidence_challenger_account_id", table_name="challenger_evidence")
    op.drop_index("ix_challenger_evidence_challenge_id", table_name="challenger_evidence")
    op.drop_table("challenger_evidence")
