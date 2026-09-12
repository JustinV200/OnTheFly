"""Exercises challenger evidence status semantics and deterministic identity behavior."""

from datetime import datetime, timezone

from app.models.account import Account
from app.services.evidence.check import CheckResult
from app.services.evidence.identity import match_identity
from app.services.evidence.platform import get_platform_evidence
from app.services.evidence.registry.stub import StubRegistryCheck



def test_not_checked_differs_from_no_match_found() -> None:
    stub_result = StubRegistryCheck().run(
        Account(
            id="acc_challenger_1",
            handle="bay-clean-pro",
            business_name="Bay Clean Professional Services",
            service_area="San Francisco Bay Area",
            created_at=datetime.now(timezone.utc),
        )
    )
    no_match = CheckResult(
        source="test",
        checked_at=datetime.now(timezone.utc),
        status="no_match_found",
        match_confidence="no_match",
        result=None,
        limitations="test",
    )

    assert stub_result.status == "not_checked"
    assert no_match.status == "no_match_found"


def test_platform_evidence_always_returns_result(db_session) -> None:
    result = get_platform_evidence("acc_challenger_1", db_session)

    assert result.result is not None
    assert result.source == "platform data"


def test_adverse_records_only_show_on_confirmed_identity_matches(db_session) -> None:
    confirmed = db_session.get(Account, "acc_challenger_1")
    assert confirmed is not None
    setattr(confirmed, "confirmed_adverse_record", {"license_status": "suspended"})

    unconfirmed = Account(
        id="external-1",
        handle="bay-clean-pro",
        business_name="Bay Clean Professional Services",
        service_area="San Francisco Bay Area",
        created_at=datetime.now(timezone.utc),
    )
    setattr(unconfirmed, "confirmed_adverse_record", {"license_status": "suspended"})

    confirmed_result = match_identity(confirmed, db_session)
    unconfirmed_result = match_identity(unconfirmed, db_session)

    assert confirmed_result.match_confidence == "confirmed"
    assert confirmed_result.result is not None
    assert "adverse_record" in confirmed_result.result
    assert unconfirmed_result.match_confidence != "confirmed"
    assert unconfirmed_result.result is not None
    assert "adverse_record" not in unconfirmed_result.result
