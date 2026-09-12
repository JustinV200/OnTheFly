"""Exercises fly-brain spend signals end to end on the fixture import: baselines, price changes, and charge flags."""

from sqlalchemy import select

from app.models.service_expense import ServiceExpense
from app.services.transactions.import_run import run_import

PROVIDER_ACCOUNT_ID = "fixture_apex_main"
OWNER_HEADERS = {"X-Account-ID": "acc_owner_1"}


def _expense(db_session, vendor: str) -> ServiceExpense:
    expense = db_session.scalar(select(ServiceExpense).where(ServiceExpense.normalized_vendor == vendor))
    assert expense is not None
    return expense


def test_price_change_and_one_off_do_not_distort_the_baseline(db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)

    orkin = _expense(db_session, "Orkin Pest Control")

    # $185 x3 (plus a $450 one-off), then $205 x3. The owner pays $205 a month now; the
    # old mean-of-everything baseline reported $231.42.
    assert orkin.cadence == "monthly"
    assert orkin.amount_minor_per_period == 20500
    assert orkin.annualized_amount_minor == 246000


def test_signals_report_the_confirmed_change_and_flag_the_one_off(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    orkin = _expense(db_session, "Orkin Pest Control")

    response = client.get(f"/api/spend-signals/{orkin.id}", headers=OWNER_HEADERS)

    assert response.status_code == 200
    report = response.json()
    assert report["baseline"]["basis"] == "current_price_level"
    assert report["baseline"]["amount_minor"] == 20500
    assert len(report["baseline"]["excluded_one_off_transaction_ids"]) == 1

    shifts = report["price_levels"]["shifts"]
    assert len(shifts) == 1
    assert shifts[0]["previous_amount_minor"] == 18500
    assert shifts[0]["new_amount_minor"] == 20500
    assert shifts[0]["change_basis_points"] == 1081
    assert shifts[0]["changed_at"].startswith("2026-06-12")

    by_amount = {(charge["posted_at"][:10], charge["amount_minor"]): charge for charge in report["charges"]}
    one_off = by_amount[("2026-04-26", 45000)]
    assert one_off["status"] == "unusual"
    assert set(one_off["reasons"]) == {"amount_unlike_earlier_charges", "description_unlike_earlier_charges"}
    assert by_amount[("2026-06-12", 20500)]["status"] == "unusual"
    assert by_amount[("2026-07-12", 20500)]["status"] == "typical"
    assert by_amount[("2026-03-12", 18500)]["status"] == "not_enough_history"
    assert report["unusual_charge_count"] == 2

    components = {entry["component"] for entry in report["fly_brain"]}
    assert components == {"compound_eye", "mushroom_body_novelty"}


def test_unconfirmed_jump_is_pending_and_kept_out_of_the_baseline(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    green_thumb = _expense(db_session, "Green Thumb Landscaping")

    report = client.get(f"/api/spend-signals/{green_thumb.id}", headers=OWNER_HEADERS).json()

    # Every-two-months billing is bimonthly (x6 a year), not quarterly (x4).
    assert green_thumb.cadence == "bimonthly"
    assert green_thumb.annualized_amount_minor == 570000
    pending = report["price_levels"]["pending_change"]
    assert pending["latest_amount_minor"] == 105000
    assert pending["level_amount_minor"] == 95000
    assert report["price_levels"]["shifts"] == []
    assert report["baseline"]["amount_minor"] == 95000
    assert len(report["baseline"]["excluded_unconfirmed_transaction_ids"]) == 1


def test_variable_purchases_fall_back_to_the_average_and_flag_nothing(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    office_depot = _expense(db_session, "Office Depot")

    report = client.get(f"/api/spend-signals/{office_depot.id}", headers=OWNER_HEADERS).json()

    assert report["price_levels"]["is_assessed"] is False
    assert report["price_levels"]["not_assessed_reason"] == "amounts_too_variable"
    assert report["baseline"]["basis"] == "average_of_charges"
    assert report["baseline"]["amount_minor"] == (5400 + 12500 + 28600 + 19750) // 4
    assert report["unusual_charge_count"] == 0
    assert {charge["status"] for charge in report["charges"]} <= {"not_enough_history", "no_stable_pattern"}
    compound_eye = next(entry for entry in report["fly_brain"] if entry["component"] == "compound_eye")
    assert "no stable price" in compound_eye["role"]


def test_steady_expense_has_no_flags_after_warm_up(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    sparkle = _expense(db_session, "Sparkle Clean")

    report = client.get(f"/api/spend-signals/{sparkle.id}", headers=OWNER_HEADERS).json()

    assert report["baseline"]["amount_minor"] == 240000
    assert report["price_levels"]["shifts"] == []
    assert report["unusual_charge_count"] == 0


def test_signals_are_private_to_the_owner(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    sparkle = _expense(db_session, "Sparkle Clean")

    assert client.get(f"/api/spend-signals/{sparkle.id}", headers={}).status_code == 401
    assert (
        client.get(f"/api/spend-signals/{sparkle.id}", headers={"X-Account-ID": "acc_challenger_1"}).status_code
        == 404
    )
