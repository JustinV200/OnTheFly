"""Sandbox-only Stripe REST boundary with validated responses and timeouts."""

from typing import TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings

ResponseModel = TypeVar("ResponseModel", bound=BaseModel)


class StripeError(Exception):
    """Safe provider error without credentials or raw responses."""


class StripeClient:
    """Reject live credentials and use a fixed Stripe host."""

    def request(
        self,
        method: str,
        path: str,
        schema: type[ResponseModel],
        data: dict[str, str] | None = None,
        key: str | None = None,
    ) -> ResponseModel:
        """Validate responses; never immediately retry rate-limited calls."""
        settings = get_settings()
        if not settings.stripe_secret_key.startswith(("sk_test_", "rk_test_")):
            raise StripeError("Configure STRIPE_SECRET_KEY with a Stripe sandbox key.")
        headers = {"Stripe-Version": "2024-06-20"}
        if key:
            headers["Idempotency-Key"] = key
        try:
            with httpx.Client(
                base_url="https://api.stripe.com/v1/",
                timeout=20,
                auth=(settings.stripe_secret_key, ""),
                headers=headers,
            ) as client:
                response = client.request(
                    method,
                    path,
                    params=data if method == "GET" else None,
                    data=data if method != "GET" else None,
                )
            if response.status_code == 429:
                raise StripeError("Stripe rate limit reached. Wait and retry.")
            if response.is_error:
                raise StripeError(
                    f"Stripe request failed ({response.status_code}). Check sandbox configuration or retry."
                )
            return schema.model_validate(response.json())
        except (httpx.HTTPError, ValidationError, ValueError) as exc:
            raise StripeError(
                "Stripe is unavailable or returned unexpected data. Retry shortly."
            ) from exc
