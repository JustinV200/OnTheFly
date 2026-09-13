"""Add tasks, requirements, splits, cost basis rates, market evidence and savings cards (roadmap 12, steps 1–9).

Changes to existing tables are additive: new nullable columns, and expense_id / price_minor relaxed to nullable so a
new task or a piece (no expense, possibly a hidden price) can have a listing. No cleaning scope column is dropped.
Every existing listing is backfilled as a rebid task whose poster and task owner are the listing's owner_account_id,
and its expense's scope versions are linked to that task. Downgrade drops the new tables and columns; it can only
re-tighten expense_id / price_minor when no row relies on them being null.
"""

from collections.abc import Sequence
from datetime import datetime, timezone
import uuid

from alembic import op
import sqlalchemy as sa

revision: str = "0013_task_ownership"
down_revision: str | None = "0012_outreach"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

# Maps a listing's stored visibility onto the task lifecycle. Unknown values fall back to private, the safe state.
_STATE_BY_VISIBILITY = {
    "private": "private",
    "scope_confirmed": "scope_confirmed",
    "public": "public",
    "closed": "closed",
    "shortlisted": "shortlisted",
}


def upgrade() -> None:
    """Create the roadmap 12 tables, relax and extend the listing tables, then backfill tasks."""

    _create_tasks()
    _create_scope_tables()
    _create_split_tables()
    _create_savings_tables()

    with op.batch_alter_table("scope_versions") as batch:
        batch.alter_column("expense_id", existing_type=sa.String(length=36), nullable=True)
        batch.add_column(sa.Column("task_id", sa.String(length=36), nullable=True))
        batch.add_column(sa.Column("category_fields", sa.Text(), nullable=True))
        batch.create_foreign_key("fk_scope_versions_task_id", "tasks", ["task_id"], ["id"])
        batch.create_index("ix_scope_versions_task_id", ["task_id"])
    with op.batch_alter_table("public_listings") as batch:
        batch.alter_column("expense_id", existing_type=sa.String(length=36), nullable=True)
        batch.alter_column("price_minor", existing_type=sa.Integer(), nullable=True)
        batch.add_column(sa.Column("task_id", sa.String(length=36), nullable=True))
        batch.add_column(sa.Column("title", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("requirements_json", sa.Text(), nullable=True))
        batch.add_column(sa.Column("constraints_json", sa.Text(), nullable=True))
        batch.add_column(sa.Column("scope_fields_json", sa.Text(), nullable=True))
        batch.add_column(sa.Column("is_subcontract", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch.add_column(sa.Column("show_price", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch.create_foreign_key("fk_public_listings_task_id", "tasks", ["task_id"], ["id"])
        batch.create_index("ix_public_listings_task_id", ["task_id"])
    with op.batch_alter_table("visibility_audits") as batch:
        batch.alter_column("expense_id", existing_type=sa.String(length=36), nullable=True)
        batch.add_column(sa.Column("task_id", sa.String(length=36), nullable=True))
        batch.create_index("ix_visibility_audits_task_id", ["task_id"])

    _backfill_rebid_tasks()


def downgrade() -> None:
    """Drop the roadmap 12 columns and tables. Fails loudly if a listing without an expense or price still exists."""

    with op.batch_alter_table("visibility_audits") as batch:
        batch.drop_index("ix_visibility_audits_task_id")
        batch.drop_column("task_id")
        batch.alter_column("expense_id", existing_type=sa.String(length=36), nullable=False)
    with op.batch_alter_table("public_listings") as batch:
        batch.drop_index("ix_public_listings_task_id")
        batch.drop_constraint("fk_public_listings_task_id", type_="foreignkey")
        batch.drop_column("show_price")
        batch.drop_column("is_subcontract")
        batch.drop_column("scope_fields_json")
        batch.drop_column("constraints_json")
        batch.drop_column("requirements_json")
        batch.drop_column("title")
        batch.drop_column("task_id")
        batch.alter_column("price_minor", existing_type=sa.Integer(), nullable=False)
        batch.alter_column("expense_id", existing_type=sa.String(length=36), nullable=False)
    with op.batch_alter_table("scope_versions") as batch:
        batch.drop_index("ix_scope_versions_task_id")
        batch.drop_constraint("fk_scope_versions_task_id", type_="foreignkey")
        batch.drop_column("category_fields")
        batch.drop_column("task_id")
        batch.alter_column("expense_id", existing_type=sa.String(length=36), nullable=False)

    for table in (
        "savings_cards",
        "market_evidence",
        "cost_basis_rates",
        "requirement_assignments",
        "task_splits",
        "challenge_requirement_responses",
        "scope_constraints",
        "requirements",
        "task_events",
        "tasks",
    ):
        op.drop_table(table)


def _create_tasks() -> None:
    op.create_table(
        "tasks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("origin", sa.String(length=16), nullable=False),
        sa.Column("expense_id", sa.String(length=36), nullable=True),
        sa.Column("parent_task_id", sa.String(length=36), nullable=True),
        sa.Column("posted_by_account_id", sa.String(length=64), nullable=False),
        sa.Column("owner_account_id", sa.String(length=64), nullable=False),
        sa.Column("depth", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("state", sa.String(length=32), nullable=False, server_default="private"),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("accepted_challenge_id", sa.String(length=36), nullable=True),
        sa.Column("accepted_scope_version_id", sa.String(length=36), nullable=True),
        sa.Column("accepted_price_minor", sa.Integer(), nullable=True),
        sa.Column("listed_starting_price_minor", sa.Integer(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("billing_period", sa.String(length=32), nullable=False),
        sa.Column("parent_scope_changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["expense_id"], ["service_expenses.id"]),
        sa.ForeignKeyConstraint(["parent_task_id"], ["tasks.id"]),
        sa.ForeignKeyConstraint(["posted_by_account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["owner_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_expense_id", "tasks", ["expense_id"])
    op.create_index("ix_tasks_parent_task_id", "tasks", ["parent_task_id"])
    op.create_index("ix_tasks_posted_by_account_id", "tasks", ["posted_by_account_id"])
    op.create_index("ix_tasks_owner_account_id", "tasks", ["owner_account_id"])
    op.create_table(
        "task_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=64), nullable=False),
        sa.Column("kind", sa.String(length=48), nullable=False),
        sa.Column("detail_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_events_task_id", "task_events", ["task_id"])


def _create_scope_tables() -> None:
    op.create_table(
        "requirements",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("scope_version_id", sa.String(length=36), nullable=False),
        sa.Column("requirement_key", sa.String(length=64), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("priority", sa.String(length=8), nullable=False, server_default="must"),
        sa.Column("labor_category", sa.String(length=120), nullable=True),
        sa.Column("psc", sa.String(length=8), nullable=True),
        sa.Column("naics", sa.String(length=8), nullable=True),
        sa.Column("tags_status", sa.String(length=16), nullable=False, server_default="draft"),
        sa.Column("hours_estimate", sa.Integer(), nullable=True),
        sa.Column("hours_status", sa.String(length=16), nullable=False, server_default="unanswered"),
        sa.Column("source", sa.String(length=16), nullable=False, server_default="owner"),
        sa.ForeignKeyConstraint(["scope_version_id"], ["scope_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scope_version_id", "requirement_key", name="uq_requirement_version_key"),
    )
    op.create_index("ix_requirements_scope_version_id", "requirements", ["scope_version_id"])
    op.create_table(
        "scope_constraints",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("scope_version_id", sa.String(length=36), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("value", sa.String(length=255), nullable=False),
        sa.Column("inherited_from_task_id", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["scope_version_id"], ["scope_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scope_constraints_scope_version_id", "scope_constraints", ["scope_version_id"])
    op.create_table(
        "challenge_requirement_responses",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("challenge_id", sa.String(length=36), nullable=False),
        sa.Column("challenge_revision_id", sa.String(length=36), nullable=True),
        sa.Column("scope_version_id", sa.String(length=36), nullable=False),
        sa.Column("requirement_key", sa.String(length=64), nullable=False),
        sa.Column("is_included", sa.Boolean(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["challenge_id"], ["challenges.id"]),
        sa.ForeignKeyConstraint(["challenge_revision_id"], ["challenge_revisions.id"]),
        sa.ForeignKeyConstraint(["scope_version_id"], ["scope_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_challenge_requirement_responses_challenge_id", "challenge_requirement_responses", ["challenge_id"]
    )
    op.create_index(
        "ix_challenge_requirement_responses_challenge_revision_id",
        "challenge_requirement_responses",
        ["challenge_revision_id"],
    )


def _create_split_tables() -> None:
    op.create_table(
        "task_splits",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("parent_task_id", sa.String(length=36), nullable=False),
        sa.Column("child_task_id", sa.String(length=36), nullable=False),
        sa.Column("split_by_account_id", sa.String(length=64), nullable=False),
        sa.Column("split_before_acceptance", sa.Boolean(), nullable=False),
        sa.Column("entry_point", sa.String(length=32), nullable=False),
        sa.Column("cut_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("billing_period", sa.String(length=32), nullable=False),
        sa.Column("savings_card_id", sa.String(length=36), nullable=True),
        sa.Column("parent_scope_version_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("undone_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["parent_task_id"], ["tasks.id"]),
        sa.ForeignKeyConstraint(["child_task_id"], ["tasks.id"]),
        sa.ForeignKeyConstraint(["split_by_account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("child_task_id"),
    )
    op.create_index("ix_task_splits_parent_task_id", "task_splits", ["parent_task_id"])
    op.create_table(
        "requirement_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("split_id", sa.String(length=36), nullable=False),
        sa.Column("requirement_key", sa.String(length=64), nullable=False),
        sa.Column("child_requirement_key", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["split_id"], ["task_splits.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("split_id", "requirement_key", name="uq_requirement_assignment_split_key"),
    )
    op.create_index("ix_requirement_assignments_split_id", "requirement_assignments", ["split_id"])


def _create_savings_tables() -> None:
    op.create_table(
        "cost_basis_rates",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=64), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=True),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("labor_category", sa.String(length=120), nullable=False),
        sa.Column("rate_minor_per_hour", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("provenance", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cost_basis_rates_account_id", "cost_basis_rates", ["account_id"])
    op.create_index("ix_cost_basis_rates_task_id", "cost_basis_rates", ["task_id"])
    op.create_table(
        "market_evidence",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("provenance", sa.String(length=16), nullable=False),
        sa.Column("query_json", sa.Text(), nullable=False),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("result_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("limitations", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_market_evidence_task_id", "market_evidence", ["task_id"])
    op.create_table(
        "savings_cards",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=64), nullable=False),
        sa.Column("scope_version_id", sa.String(length=36), nullable=False),
        sa.Column("segment_key", sa.String(length=255), nullable=False),
        sa.Column("inputs_json", sa.Text(), nullable=False),
        sa.Column("evidence_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("thresholds_json", sa.Text(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("billing_period", sa.String(length=32), nullable=False),
        sa.Column("keep_cost_minor", sa.Integer(), nullable=True),
        sa.Column("suggested_cut_minor", sa.Integer(), nullable=True),
        sa.Column("oversight_minor", sa.Integer(), nullable=True),
        sa.Column("modeled_savings_minor", sa.Integer(), nullable=True),
        sa.Column("modeled_savings_basis_points", sa.Integer(), nullable=True),
        sa.Column("tier", sa.String(length=32), nullable=False),
        sa.Column("reasons_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="suggested"),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["scope_version_id"], ["scope_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_savings_cards_task_id", "savings_cards", ["task_id"])


def _backfill_rebid_tasks() -> None:
    # Every listing that exists today came from the expense publish flow, so each one is a rebid of that expense.
    connection = op.get_bind()
    listings = connection.execute(
        sa.text(
            "SELECT id, expense_id, owner_account_id, category, price_currency, billing_cadence, visibility "
            "FROM public_listings WHERE task_id IS NULL"
        )
    ).mappings().all()
    now = datetime.now(timezone.utc)
    for listing in listings:
        task_id = str(uuid.uuid4())
        connection.execute(
            sa.text(
                "INSERT INTO tasks (id, origin, expense_id, parent_task_id, posted_by_account_id, owner_account_id, "
                "depth, state, title, category, currency, billing_period, created_at, updated_at) "
                "VALUES (:id, 'rebid', :expense_id, NULL, :owner, :owner, 0, :state, NULL, :category, :currency, "
                ":period, :now, :now)"
            ),
            {
                "id": task_id,
                "expense_id": listing["expense_id"],
                "owner": listing["owner_account_id"],
                "state": _STATE_BY_VISIBILITY.get(listing["visibility"], "private"),
                "category": listing["category"],
                "currency": listing["price_currency"],
                "period": listing["billing_cadence"],
                "now": now,
            },
        )
        connection.execute(
            sa.text("UPDATE public_listings SET task_id = :task_id WHERE id = :listing_id"),
            {"task_id": task_id, "listing_id": listing["id"]},
        )
        connection.execute(
            sa.text("UPDATE scope_versions SET task_id = :task_id WHERE expense_id = :expense_id AND task_id IS NULL"),
            {"task_id": task_id, "expense_id": listing["expense_id"]},
        )
