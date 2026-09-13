"""Add a small synthetic GovCon ledger through the existing fixture import pipeline.
This command never resets the database or calls Stripe.
"""
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_engine, get_session_factory
from app.models import Account, ServiceExpense
from app.services.transactions.fixture.source import FixtureSource
from app.services.transactions.import_run import run_import

OWNER_ID = "acc_govcon_1"
PROVIDER_ACCOUNT_ID = "fixture_govcon_main"


def seed_govcon_demo(db: Session) -> dict[str, object]:
    """Import stable IDs without overwriting other companies or their connections."""
    account = db.get(Account, OWNER_ID)
    if account is None:
        db.add(Account(id=OWNER_ID, handle="govcon-industries", business_name="GovCon Industries",
                       service_area="Northern Virginia"))
        db.commit()
    elif account.handle != "govcon-industries":
        raise ValueError("GovCon account ID is already used by another company.")
    # Explicit fixture selection works even if the default source is Stripe.
    # run_import invokes sync_service_expenses after persisting normal Transaction rows.
    result = run_import(OWNER_ID, PROVIDER_ACCOUNT_ID, db, source=FixtureSource())
    expenses = db.scalars(select(ServiceExpense).where(
        ServiceExpense.owner_account_id == OWNER_ID
    ).order_by(ServiceExpense.annualized_amount_minor.desc())).all()
    return {"account_id": OWNER_ID, "company": "GovCon Industries", "source": "fixture",
            "import": result.model_dump(),
            "expenses": [{"service": e.normalized_vendor, "monthly_minor": e.amount_minor_per_period,
                          "annualized_minor": e.annualized_amount_minor, "currency": e.currency,
                          "cadence": e.cadence, "payments": e.period_count,
                          "visibility": e.visibility} for e in expenses],
            "annualized_total_minor": sum(e.annualized_amount_minor for e in expenses)}


def main() -> None:
    """Populate only the configured local SQLite demo database and print counts."""
    engine = get_engine()
    if engine.dialect.name != "sqlite":
        raise RuntimeError("This demo seed is scoped to local SQLite. No remote database was changed.")
    with get_session_factory()() as db:
        print(json.dumps(seed_govcon_demo(db), indent=2))


if __name__ == "__main__":
    main()
