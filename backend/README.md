# Backend

FastAPI + SQLAlchemy + Alembic for On the Fly. Local storage is SQLite. Stripe sandbox ingestion and the existing marketplace are implemented; the GovCon REBID services in [the current roadmap](../roadmap/README.md) are the next work.

## Setup (PowerShell)

From the repository root:

```powershell
cd backend
python -m pip install -e ".[dev]"
if (!(Test-Path .env)) { Copy-Item .env.example .env }
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Startup seeds the existing demo companies when the schema is available. An empty database has no expenses until imported. API documentation: http://127.0.0.1:8000/docs.

## Stripe sandbox

Set `STRIPE_SECRET_KEY=sk_test_...` in `.env`. Keep keys out of source control. The frontend needs the publishable key from the same sandbox.

The minimal flow requests transactions only. Dedicated `/api/connections/stripe` routes provide local status, session creation, completion, sync polling and imported transaction inspection. They select the Stripe adapter explicitly, so `TRANSACTION_SOURCE=fixture` can remain the local default. No webhook secret is needed.

Company binding is enforced against the demo account header. This is sandbox isolation, not production authentication. Live keys/data are rejected. See [Stripe integration notes](app/services/transactions/stripe/NOTES.md).

## Data currently available

- Existing `fixture_apex_main` cleaning/demo transactions.
- Stripe-provided simulated transactions after a completed sandbox connection.
- GovCon Industries and `fixture_govcon_main` are planned, not seeded yet.
- USAspending, public labor-rate pricing, OpenAI, Tavily and Fly Scout are not integrated.

## Optional old demo reset

`python -m app.cli.seed_demo` drops/recreates the configured database and creates the earlier cleaning scenario. Stop the server and back up any important data first. Stored Stripe connections are removed. Its limited counteroffer preservation is not a full backup. Do not run this command as part of normal startup or for the new GovCon ledger. It seeds fixture data, so it requires `TRANSACTION_SOURCE=fixture` and exits before touching the database under any other source.

## Verification

```powershell
python -m pytest -q
```

Last check (2026-09-12): 313 backend tests passed, including mocked-provider ownership, pagination and transaction-status tests. The Windows test-engine cleanup was fixed. Real Stripe sandbox consent and the new REBID story still need their own acceptance runs.
