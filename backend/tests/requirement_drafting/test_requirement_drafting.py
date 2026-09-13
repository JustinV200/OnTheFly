"""Requirement drafting: code checks every model row, a missing key reads as not run, failures are stated, and the
OpenAI client never leaks its key or raw response. No test reaches the network: drafters are faked and the OpenAI
client runs on httpx.MockTransport.
"""

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.requirement_drafts.router import requirement_drafter_dependency
from app.core.config import Settings
from app.main import create_app
from app.services.requirement_drafting import (
    DraftingError,
    DraftRequest,
    ModelDraft,
    ModelRequirement,
    draft_requirements,
    get_requirement_drafter,
)
from app.services.requirement_drafting.openai import OpenAIClient, OpenAIError, OpenAIRequirementDrafter
from app.services.requirement_drafting.unavailable import UnavailableRequirementDrafter

REQUEST = {
    "description": "Keep our GovCloud environment patched and run monthly vulnerability scans for the ISSO.",
    "category": "devsecops",
    "billing_period": "annual",
    "existing_requirements": ["Run monthly vulnerability scans"],
}


class FakeDrafter:
    """Returns a fixed model answer, or raises the error it was given."""

    model: str | None = "fake-model"
    prompt_version: str | None = "test-v1"

    def __init__(self, answer: ModelDraft | None = None, error: Exception | None = None) -> None:
        self._answer = answer
        self._error = error

    def draft(self, request: DraftRequest) -> ModelDraft:
        if self._error is not None:
            raise self._error
        assert self._answer is not None
        return self._answer


def _row(text: str, **fields: object) -> ModelRequirement:
    values: dict[str, object] = {"priority": "must", "labor_category": None, "psc": None, "naics": None, "hours_estimate": None}
    values.update(fields)
    return ModelRequirement(text=text, **values)  # type: ignore[arg-type]  # test rows mirror the model's loose shape


def _client_with(drafter: object) -> TestClient:
    app = create_app()
    app.dependency_overrides[requirement_drafter_dependency] = lambda: drafter
    return TestClient(app)


def test_drafted_rows_are_checked_in_code_and_marked_as_drafts(client: TestClient) -> None:
    answer = ModelDraft(
        requirements=[
            _row("Patch the  GovCloud environment monthly", labor_category="Cloud Engineer", psc="d307", naics="541512", hours_estimate=1040),
            _row("Run monthly vulnerability scans", hours_estimate=60),
            _row("Write findings for the ISSO", psc="not-a-psc", naics="5415", hours_estimate=0, priority="should"),
            _row("   "),
        ],
        open_questions=["Which operating systems are in scope?", ""],
    )

    with _client_with(FakeDrafter(answer)) as test_client:
        response = test_client.post("/api/requirement-drafts", headers={"X-Account-ID": "acc_govcon_1"}, json=REQUEST)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "drafted" and body["model"] == "fake-model" and body["prompt_version"] == "test-v1"
    rows = body["requirements"]
    assert [row["text"] for row in rows] == ["Patch the GovCloud environment monthly", "Write findings for the ISSO"]
    assert rows[0]["psc"] == "D307" and rows[0]["naics"] == "541512" and rows[0]["hours_estimate"] == 1040
    assert rows[0]["hours_status"] == "draft"
    # A malformed code or impossible hour count becomes unanswered, never a guess code kept anyway.
    assert rows[1]["psc"] is None and rows[1]["naics"] is None and rows[1]["hours_estimate"] is None
    assert rows[1]["hours_status"] == "unanswered" and rows[1]["priority"] == "should"
    assert all(row["source"] == "llm-draft" and row["tags_status"] == "draft" for row in rows)
    # The repeat of an existing requirement and the blank row were refused and counted.
    assert body["dropped_count"] == 2
    assert body["open_questions"] == ["Which operating systems are in scope?"]


def test_without_a_key_drafting_is_not_run(client: TestClient) -> None:
    response = client.post("/api/requirement-drafts", headers={"X-Account-ID": "acc_govcon_1"}, json=REQUEST)

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "not_run"
    assert "OPENAI_API_KEY" in response.json()["detail"]
    assert response.json()["requirements"] == []


def test_factory_picks_openai_only_with_a_key() -> None:
    assert isinstance(get_requirement_drafter(Settings(openai_api_key="", _env_file=None)), UnavailableRequirementDrafter)
    assert isinstance(get_requirement_drafter(Settings(openai_api_key="sk-test", _env_file=None)), OpenAIRequirementDrafter)


def test_a_failed_draft_is_stated_with_no_rows() -> None:
    result = draft_requirements(DraftRequest.model_validate(REQUEST), FakeDrafter(error=DraftingError("OpenAI took too long")))

    assert result.status == "failed" and result.detail == "OpenAI took too long" and result.requirements == []


def test_drafting_needs_an_acting_business(client: TestClient) -> None:
    response = client.post("/api/requirement-drafts", json=REQUEST)

    assert response.status_code == 401


def _openai_client(handler: object) -> OpenAIClient:
    return OpenAIClient(api_key="sk-secret-value", http_client=httpx.Client(transport=httpx.MockTransport(handler)))  # type: ignore[arg-type]


def test_openai_drafter_sends_a_strict_schema_and_parses_the_answer() -> None:
    sent: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        sent.update(json.loads(request.content))
        content = json.dumps({"requirements": [{"text": "Patch servers", "priority": "must", "labor_category": None, "psc": None, "naics": None, "hours_estimate": None}], "open_questions": []})
        return httpx.Response(200, json={"choices": [{"finish_reason": "stop", "message": {"content": content, "refusal": None}}]})

    draft = OpenAIRequirementDrafter(_openai_client(handler), model="gpt-test").draft(DraftRequest.model_validate(REQUEST))

    assert draft.requirements[0].text == "Patch servers"
    assert sent["model"] == "gpt-test"
    assert sent["response_format"]["json_schema"]["strict"] is True  # type: ignore[index]
    # No money field exists for the model to fill (plan2, "Model and code boundaries").
    properties = sent["response_format"]["json_schema"]["schema"]["properties"]["requirements"]["items"]["properties"]  # type: ignore[index]
    assert not any("price" in name or "rate" in name or "cost" in name for name in properties)


@pytest.mark.parametrize(
    ("status", "body", "message"),
    [
        (401, {"error": {"message": "Incorrect API key sk-secret-value"}}, "rejected the API key"),
        (429, {"error": {"message": "quota"}}, "rate limit"),
        (200, {"choices": [{"finish_reason": "stop", "message": {"content": None, "refusal": "I can't help"}}]}, "declined"),
        (200, {"choices": [{"finish_reason": "stop", "message": {"content": "not json"}}]}, "isn't valid JSON"),
    ],
)
def test_openai_failures_raise_a_safe_message(status: int, body: dict[str, object], message: str) -> None:
    client = _openai_client(lambda request: httpx.Response(status, json=body))

    with pytest.raises(OpenAIError) as caught:
        client.complete_json("gpt-test", [], "requirement_draft", {})

    assert message in str(caught.value)
    assert "sk-secret-value" not in str(caught.value)
