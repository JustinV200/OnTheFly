"""Loads environment configuration once for the backend.
This module owns env parsing so other modules receive typed settings only.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings loaded from environment variables."""

    database_url: str = "sqlite:///./dev.db"
    transaction_source: str = "fixture"
    # No Stripe host or webhook settings: StripeClient pins api.stripe.com so a mis-set env var
    # can't send the sandbox key elsewhere, and the sandbox flow polls instead of taking webhooks.
    stripe_secret_key: str = ""
    claude_api_key: str = ""
    # Current default Claude model as of 2026-09-12. Nothing calls the API yet, so re-confirm
    # the ID when the first AI feature lands (CLAUDE.md: confirm during implementation).
    claude_model: str = "claude-opus-5"
    app_version: str = "0.1.0"
    # Comma-separated allowed CORS origins; defaults to local dev frontend
    cors_allow_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Provider discovery (roadmap 08, step 1). "fixture" returns deterministic, fictional demo providers
    # labeled as demo data; "tavily" runs a real web search and needs TAVILY_API_KEY; "usaspending_tavily"
    # searches public USAspending contract awards (no key) and enriches those suppliers through Tavily when keyed.
    discovery_source: str = "fixture"
    # Without a key the Tavily source reports discovery as not run; it never falls back to fixtures.
    tavily_api_key: str = ""

    # Invitation delivery channel. "sandbox" stores rendered invitations in the sandbox outbox table and
    # no email leaves the machine; "smtp" sends real email, only to OUTREACH_RECIPIENT_ALLOWLIST.
    outreach_channel: str = "sandbox"
    # The platform sends on the business's behalf, so From names the platform, never the owner.
    outreach_from_name: str = "On the Fly"
    outreach_from_email: str = "invitations@onthefly.example"
    # The platform's physical postal address for the commercial-email footer. Never the business's
    # address, which would disclose a private street address. Empty blocks the smtp channel.
    outreach_postal_address: str = ""
    # Base of the public frontend; invitations link to {base}/listings/{id} and {base}/opt-out/{token}.
    public_app_base_url: str = "http://localhost:5173"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_starttls: bool = True
    # Comma-separated exact addresses the smtp channel may send to (roadmap 08, "Use a sandbox or a
    # whitelist until the approval gate is proven"). Empty means smtp sends to nobody.
    outreach_recipient_allowlist: str = ""

    # Task splitting (roadmap 12). Ways to save may suggest at most this many active pieces per task; manual
    # splits are never capped, and there is no depth limit, so a chain can keep splitting (roadmap open question 4).
    max_suggested_pieces_per_task: int = 5
    # Ways to save thresholds (plan2, "Thresholds"). Printed on every card; never lowered to force a demo result.
    savings_min_basis_points: int = 1000
    savings_min_annual_minor: int = 2500000
    savings_min_suppliers: int = 3
    savings_lookback_years: int = 5
    # Market evidence behind Ways to save. "mock" returns deterministic demo data labeled as such (roadmap open
    # question 2); "live" queries public USAspending prime awards and subawards on every refresh, and reports labor
    # rates as not checked because no public rate client exists yet.
    market_data_source: str = "mock"
    # Presenter controls (stage the task-chain demo, simulate a labeled demo bid). Local demo only; set false
    # anywhere the database is shared, since staging deletes and reseeds the GovCon task chain.
    demo_controls_enabled: bool = True

    # Extra keys stay forbidden (the pydantic-settings default): a stale or misspelled non-empty line
    # in .env stops startup instead of loading as a setting that nothing reads.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        case_sensitive=False,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the singleton settings object for the current process."""

    return Settings()
