"""Roadmap 12, step 1: every listing resolves to exactly one task, including listings that existed before tasks."""

from pathlib import Path

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine
from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.tasks import Task
from tests.outreach.support import OWNER_ID, publish_cleaning_listing

BACKEND_DIR = Path(__file__).resolve().parents[2]


def test_expense_publish_flow_links_listing_and_scope_to_one_rebid_task(db_session: Session) -> None:
    listing = publish_cleaning_listing(db_session)

    tasks = db_session.scalars(select(Task)).all()
    assert len(tasks) == 1
    task = tasks[0]
    assert listing.task_id == task.id
    assert task.origin == "rebid"
    # The listing's owner_account_id keeps meaning the poster; the poster owns the task until it accepts an offer.
    assert task.posted_by_account_id == task.owner_account_id == listing.owner_account_id == OWNER_ID
    assert task.state == "public"
    scope = db_session.get(ScopeVersion, listing.scope_version_id)
    assert scope is not None and scope.task_id == task.id


def test_every_listing_resolves_to_exactly_one_task(db_session: Session) -> None:
    publish_cleaning_listing(db_session)

    listings = db_session.scalars(select(PublicListingRecord)).all()
    assert listings
    for listing in listings:
        assert db_session.scalar(select(func.count()).select_from(Task).where(Task.id == listing.task_id)) == 1


def test_migration_backfills_existing_listings_as_rebid_tasks(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    database_url = f"sqlite:///{(tmp_path / 'backfill.db').as_posix()}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    get_settings.cache_clear()
    get_engine.cache_clear()
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(config, "0012_outreach")

    engine = create_engine(database_url, future=True)
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO accounts (id, handle, business_name, service_area, created_at) VALUES ('acc_x', 'x', 'X Co', 'Area', '2026-01-01')"))
        connection.execute(text(
            "INSERT INTO service_expenses (id, owner_account_id, normalized_vendor, cadence, recurrence_confidence, amount_minor_per_period, "
            "currency, annualized_amount_minor, first_seen, last_seen, period_count, is_eligible, eligibility_reason, is_publishable, visibility, owner_marked_ineligible) "
            "VALUES ('exp_1', 'acc_x', 'Vendor', 'monthly', 1.0, 1000, 'USD', 12000, '2026-01-01', '2026-02-01', 2, 1, 'eligible', 1, 'public', 0)"
        ))
        connection.execute(text("INSERT INTO scope_versions (id, expense_id, version_number, current_price_currency, created_at) VALUES ('sv_1', 'exp_1', 1, 'USD', '2026-01-01')"))
        connection.execute(text(
            "INSERT INTO public_listings (id, expense_id, scope_version_id, owner_account_id, category, scope_summary, price_minor, price_currency, "
            "billing_cadence, service_area_approximate, bidding_mode, show_incumbent_vendor, show_exact_address, visibility, created_at) "
            "VALUES ('lst_1', 'exp_1', 'sv_1', 'acc_x', 'cleaning', 'summary', 1000, 'USD', 'monthly', 'Area', 'sealed', 0, 0, 'public', '2026-01-01')"
        ))
    command.upgrade(config, "head")

    with engine.connect() as connection:
        task = connection.execute(text("SELECT id, origin, posted_by_account_id, owner_account_id, state, expense_id FROM tasks")).mappings().one()
        listing_task = connection.execute(text("SELECT task_id FROM public_listings WHERE id = 'lst_1'")).scalar_one()
        scope_task = connection.execute(text("SELECT task_id FROM scope_versions WHERE id = 'sv_1'")).scalar_one()
    engine.dispose()
    assert task["origin"] == "rebid"
    assert task["posted_by_account_id"] == task["owner_account_id"] == "acc_x"
    assert task["state"] == "public" and task["expense_id"] == "exp_1"
    assert listing_task == scope_task == task["id"]
