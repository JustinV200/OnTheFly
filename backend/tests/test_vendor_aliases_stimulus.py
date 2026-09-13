"""Checks the brain stimulus on vendor alias suggestions: the exact names FlyHash compared, generic captions."""

from app.models.service_expense import ServiceExpense
from app.services.expenses.aliases import VENDOR_NAME_SHAPE, suggest_vendor_aliases, vendor_name_receptors
from app.services.expenses.sync import sync_service_expenses
from app.services.expenses.vendor_group_key import base_vendor_name
from app.services.flybrain import SensoryInput, StimulusInput
from app.services.flybrain.brain_stimulus import GAP_MS, PULSE_MS, TAIL_MS, build_pulse
from app.services.transactions.import_run import run_import
from tests.test_vendor_aliases import OWNER_HEADERS, PROVIDER_ACCOUNT_ID, _expense_row
from tests.test_vendor_aliases_stripe import OWNER_HEADERS as STRIPE_OWNER_HEADERS
from tests.test_vendor_aliases_stripe import OWNER_ID as STRIPE_OWNER_ID
from tests.test_vendor_aliases_stripe import _add_charges

SLOT_MS = PULSE_MS + GAP_MS


def _stimulus(client, headers: dict[str, str] = OWNER_HEADERS) -> dict | None:
    response = client.get("/api/vendor-aliases", headers=headers)
    assert response.status_code == 200
    return response.json()["brain_stimulus"]


def _expected_pulse(caption: str, name: str, start_ms: int) -> dict:
    vector = vendor_name_receptors(name, VENDOR_NAME_SHAPE.input_dim)
    pulse = build_pulse(StimulusInput(SensoryInput.olfactory, caption, vector), VENDOR_NAME_SHAPE.input_dim, start_ms)
    assert pulse is not None
    return pulse.model_dump(mode="json")


def test_suggested_pair_plays_the_alias_name_then_the_canonical_name(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)

    stimulus = _stimulus(client)

    assert stimulus is not None
    assert stimulus["result_label"] == "Duplicate vendor suggestions"
    assert stimulus["circuits"] == ["mushroom_body_flyhash"]
    assert stimulus["receptor_count"] == VENDOR_NAME_SHAPE.input_dim
    assert stimulus["pulses"] == [
        _expected_pulse("Suggested pair 1 · first name", "Sparkle Cleaning Services LLC", 0),
        _expected_pulse("Suggested pair 1 · second name", "Sparkle Clean", SLOT_MS),
    ]
    assert stimulus["duration_ms"] == SLOT_MS + PULSE_MS + TAIL_MS


def test_stripe_names_are_replayed_without_the_currency_suffix(client, db_session) -> None:
    _add_charges(db_session, "SPARKLE CLEAN", 6)
    _add_charges(db_session, "SPARKLE CLEANING SERVICES LLC", 1, first_month=7)
    sync_service_expenses(STRIPE_OWNER_ID, db_session)

    response = client.get("/api/vendor-aliases", headers=STRIPE_OWNER_HEADERS).json()
    stimulus = response["brain_stimulus"]
    suggestion = response["suggestions"][0]
    alias_key = db_session.get(ServiceExpense, suggestion["alias"]["expense_id"]).normalized_vendor
    canonical_key = db_session.get(ServiceExpense, suggestion["canonical"]["expense_id"]).normalized_vendor

    # The index compared names without " [USD]"; the stored key would encode "usd" as a word and differ.
    assert canonical_key == "Sparkle Clean [USD]"
    assert vendor_name_receptors(canonical_key, VENDOR_NAME_SHAPE.input_dim) != vendor_name_receptors(
        "Sparkle Clean", VENDOR_NAME_SHAPE.input_dim
    )
    assert stimulus["pulses"] == [
        _expected_pulse("Suggested pair 1 · first name", base_vendor_name(alias_key, "USD"), 0),
        _expected_pulse("Suggested pair 1 · second name", "Sparkle Clean", SLOT_MS),
    ]


def test_at_most_four_pairs_are_replayed(client, db_session) -> None:
    pairs = [
        ("Orkin Pest Control", "Orkin", "pest_control"),
        ("Sparkle Cleaning Services", "Sparkle Clean", "cleaning"),
        ("Green Thumb Landscaping", "Green Thumb", "landscaping"),
        ("Brightline Janitorial", "Brightline", "janitorial"),
        ("Rentokil Waste Removal", "Rentokil", "waste"),
    ]
    for canonical, alias, category in pairs:
        db_session.add_all([_expense_row(canonical, category, 6), _expense_row(alias, category, 1)])
    db_session.commit()

    response = client.get("/api/vendor-aliases", headers=OWNER_HEADERS).json()
    captions = [pulse["caption"] for pulse in response["brain_stimulus"]["pulses"]]

    assert len(response["suggestions"]) == 5
    assert captions == [
        f"Suggested pair {position} · {side} name" for position in range(1, 5) for side in ("first", "second")
    ]
    assert response["brain_stimulus"]["pulses"][-1]["start_ms"] == 7 * SLOT_MS


def test_without_suggestions_up_to_eight_names_play_in_expense_id_order(client, db_session) -> None:
    names = ["Sparkle Cleaning", "Bright Cleaning", "Orkin Pest Control", "Office Depot", "Green Thumb Landscaping",
             "Metro Parking", "Harbor Coffee", "Summit Security", "Atlas Couriers"]
    rows = [_expense_row(name, None, 6) for name in names]
    db_session.add_all(rows)
    db_session.commit()

    response = client.get("/api/vendor-aliases", headers=OWNER_HEADERS).json()
    stimulus = response["brain_stimulus"]
    by_id = sorted((row.id, row.normalized_vendor) for row in rows)

    assert response["suggestions"] == []
    assert stimulus["pulses"] == [
        _expected_pulse(f"Vendor name {position}", name, (position - 1) * SLOT_MS)
        for position, (_, name) in enumerate(by_id[:8], start=1)
    ]


def test_no_stimulus_when_fewer_than_two_groups_are_eligible(client, db_session) -> None:
    db_session.add_all([_expense_row("Sparkle Clean", "cleaning", 6), _expense_row("Gusto", "payroll", 6, is_eligible=False)])
    db_session.commit()

    assert _stimulus(client) is None
    assert _stimulus(client, {"X-Account-ID": "acc_challenger_1"}) is None


def test_captions_carry_no_vendor_name(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)
    db_session.add_all([_expense_row("Orkin", "pest_control", 1)])
    db_session.commit()

    response = client.get("/api/vendor-aliases", headers=OWNER_HEADERS).json()
    captions = " ".join(pulse["caption"] for pulse in response["brain_stimulus"]["pulses"]).casefold()
    vendor_words = {
        word.casefold()
        for suggestion in response["suggestions"]
        for side in ("alias", "canonical")
        for word in suggestion[side]["vendor"].split()
    }

    assert vendor_words
    assert not [word for word in vendor_words if word in captions]


def test_endpoint_suggestions_match_the_service_after_the_result_shape_change(client, db_session) -> None:
    run_import("acc_owner_1", PROVIDER_ACCOUNT_ID, db_session)

    response = client.get("/api/vendor-aliases", headers=OWNER_HEADERS).json()
    scan = suggest_vendor_aliases("acc_owner_1", db_session)

    assert response["suggestions"] == [suggestion.model_dump(mode="json") for suggestion in scan.suggestions]
    assert scan.did_index_run is True
    assert response["fly_brain"][0]["component"] == "mushroom_body_flyhash"
