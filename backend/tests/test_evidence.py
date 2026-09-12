"""Exercises challenger evidence status semantics and deterministic identity behavior."""

from datetime import datetime, timezone

from app.models.account import Account
from app.services.challenges.submit import submit_challenge
from app.services.evidence.check import CheckResult
from app.services.evidence.identity import ChallengerIdentifiers, ExternalBusinessRecord, match_identity
from app.services.evidence.platform import get_platform_evidence
from app.services.evidence.refresh import get_or_refresh_challenger_evidence
from app.services.evidence.registry.stub import StubRegistryCheck
from app.services.evidence.status import rollup_evidence
from tests.test_challenges import _create_public_listing



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


ADVERSE = {"license_status": "suspended"}


def _challenger(registration_number: str | None = None) -> ChallengerIdentifiers:
    return ChallengerIdentifiers(
        legal_name="ABC Cleaning LLC",
        location="Oakland, CA",
        registration_number=registration_number,
    )


def _record(legal_name: str, location: str, registration_number: str | None) -> ExternalBusinessRecord:
    return ExternalBusinessRecord(
        source="CA Secretary of State",
        legal_name=legal_name,
        location=location,
        registration_number=registration_number,
        adverse_record=ADVERSE,
    )


def test_adverse_record_attaches_on_registration_number_match() -> None:
    result = match_identity(_challenger("C-1234567"), _record("ABC Cleaning, Inc.", "Oakland, CA", "c1234567"))

    assert result.match_confidence == "confirmed"
    assert result.result is not None
    assert result.result["adverse_record"] == ADVERSE


def test_adverse_record_withheld_for_same_name_and_city_without_identifier() -> None:
    result = match_identity(_challenger(), _record("ABC Cleaning Inc", "Oakland, CA", None))

    assert result.match_confidence == "probable"
    assert result.status == "uncertain"
    assert "adverse_record" not in (result.result or {})


def test_similarly_named_business_elsewhere_never_gets_the_record() -> None:
    """Roadmap 07: 'ABC Cleaning LLC' and 'ABC Cleaning Services Inc.' can be unrelated."""
    result = match_identity(_challenger(), _record("ABC Cleaning Services Inc.", "Fresno, CA", None))

    assert result.match_confidence == "uncertain"
    assert "adverse_record" not in (result.result or {})


def test_same_name_with_a_different_registration_number_is_no_match() -> None:
    result = match_identity(_challenger("C-1234567"), _record("ABC Cleaning LLC", "Oakland, CA", "C-7654321"))

    assert result.status == "no_match_found"
    assert result.result is None


def test_identity_is_not_checked_when_there_is_no_record() -> None:
    result = match_identity(_challenger(), None)

    assert result.status == "not_checked"
    assert result.match_confidence is None


def test_seeded_challenger_is_not_reported_as_identity_matched(db_session) -> None:
    """Regression: the matcher used to match every account against itself and report confirmed."""
    listing = _create_public_listing(db_session)
    challenge = submit_challenge(
        listing.id,
        "acc_challenger_1",
        {"price_minor": 187500, "billing_frequency": "monthly"},
        db_session,
    )

    evidence = get_or_refresh_challenger_evidence(challenge, db_session)
    identity = CheckResult.model_validate_json(evidence.identity_check)

    assert identity.status == "not_checked"


def test_rollup_names_its_sources_and_never_claims_verification() -> None:
    checks = [
        _check("platform data", "matched"),
        _check("identity match", "not_checked"),
        _check("registry stub", "not_checked"),
    ]

    rollup = rollup_evidence(checks)

    assert rollup.label == "information missing"
    assert rollup.sources_checked == ["platform data"]
    assert rollup.sources_not_run == ["identity match", "registry stub"]


def test_rollup_flags_uncertain_matches_for_review() -> None:
    rollup = rollup_evidence([_check("platform data", "matched"), _check("identity match", "uncertain")])

    assert rollup.label == "needs review"


def _check(source: str, status: str) -> CheckResult:
    return CheckResult(
        source=source,
        checked_at=datetime.now(timezone.utc),
        status=status,
        match_confidence=None,
        result=None,
        limitations="test",
    )
