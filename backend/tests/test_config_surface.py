"""Checks that every documented setting does something, and that a setting that doesn't exist can't pass as one.
A key that loads but is never read tells a developer they changed behavior when they didn't.
"""

import re
from pathlib import Path

import httpx
import pytest
from pydantic import BaseModel, ValidationError

from app.core.config import Settings, get_settings
from app.services.transactions.stripe.client import StripeClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = BACKEND_ROOT / "app"
CONFIG_MODULE = APP_ROOT / "core" / "config.py"

# Declared ahead of the first AI feature on purpose; config.py says nothing calls the API yet.
RESERVED_UNREAD_SETTINGS = {"claude_api_key", "claude_model"}


class _AnyPayload(BaseModel):
    """Accepts any Stripe response; these tests only care where the request went."""


def _env_example_keys() -> set[str]:
    lines = (BACKEND_ROOT / ".env.example").read_text(encoding="utf-8").splitlines()
    assignments = [line for line in lines if "=" in line and not line.lstrip().startswith("#")]
    # Settings is case-insensitive with no prefix, so STRIPE_SECRET_KEY maps to stripe_secret_key.
    return {line.split("=", 1)[0].strip().lower() for line in assignments}


def _app_source_outside_config() -> str:
    return "\n".join(
        path.read_text(encoding="utf-8") for path in APP_ROOT.rglob("*.py") if path.resolve() != CONFIG_MODULE
    )


def test_env_example_lists_exactly_the_settings_fields() -> None:
    assert _env_example_keys() == set(Settings.model_fields)


def test_every_setting_is_read_outside_the_config_module() -> None:
    source = _app_source_outside_config()
    unread = {
        name
        for name in Settings.model_fields
        if name not in RESERVED_UNREAD_SETTINGS and not re.search(rf"\.{name}\b", source)
    }

    assert unread == set()


def test_stale_key_in_env_file_stops_startup(tmp_path: Path) -> None:
    # An old .env copied before STRIPE_BASE_URL was removed must fail loudly, not silently keep the pinned host.
    env_file = tmp_path / ".env"
    env_file.write_text("STRIPE_BASE_URL=http://localhost:12111\n", encoding="utf-8")

    with pytest.raises(ValidationError, match="stripe_base_url"):
        Settings(_env_file=env_file)


def test_stripe_host_stays_pinned_whatever_the_environment_says(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_example")
    monkeypatch.setenv("STRIPE_BASE_URL", "http://localhost:12111")
    get_settings.cache_clear()
    requested_urls: list[httpx.URL] = []
    real_client = httpx.Client

    def respond(request: httpx.Request) -> httpx.Response:
        requested_urls.append(request.url)
        return httpx.Response(200, json={})

    def build(*args: object, **kwargs: object) -> httpx.Client:
        kwargs["transport"] = httpx.MockTransport(respond)
        return real_client(*args, **kwargs)

    monkeypatch.setattr("app.services.transactions.stripe.client.httpx.Client", build)
    StripeClient().request("GET", "financial_connections/accounts", _AnyPayload)

    assert [(url.scheme, url.host) for url in requested_urls] == [("https", "api.stripe.com")]
