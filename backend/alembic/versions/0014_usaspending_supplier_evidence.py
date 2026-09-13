"""Keep USAspending supplier identities and source-attributable evidence on provider candidates.

supplier_uei is the award recipient's identifier, null for fixture, web and manual candidates.
evidence holds the JSON award and web-page records behind a candidate; existing rows start empty.
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0014_usaspending_supplier_evidence"
down_revision: str | None = "0013_task_ownership"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("provider_candidates") as batch:
        batch.add_column(sa.Column("supplier_uei", sa.String(length=32), nullable=True))
        batch.add_column(sa.Column("evidence", sa.Text(), nullable=False, server_default="[]"))
        batch.create_index("ix_provider_candidates_supplier_uei", ["supplier_uei"])


def downgrade() -> None:
    with op.batch_alter_table("provider_candidates") as batch:
        batch.drop_index("ix_provider_candidates_supplier_uei")
        batch.drop_column("evidence")
        batch.drop_column("supplier_uei")
