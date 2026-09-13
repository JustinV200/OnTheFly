"""Add the match mode that lets alias-merge correction rules match their exact descriptor only.

Existing rules were all owner renames, so the server default keeps them whole-word ("word").
The revision id is shorter than this file's name: Alembic's alembic_version.version_num column
is VARCHAR(32), and Postgres rejects a longer id when it records the upgrade.
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0010_eligibility_exact_alias"
down_revision: str | None = "0009_add_vendor_alias_dismissals"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Add vendor_corrections.match_mode, defaulting existing rows to whole-word matching."""

    op.add_column(
        "vendor_corrections",
        sa.Column("match_mode", sa.String(length=16), nullable=False, server_default="word"),
    )


def downgrade() -> None:
    """Drop vendor_corrections.match_mode; every rule reverts to whole-word matching."""

    op.drop_column("vendor_corrections", "match_mode")
