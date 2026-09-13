# On the Fly

**Click REBID on what your business already pays for.**

On the Fly is being built into a spend-to-supplier marketplace: connect a business account, identify replaceable spend, research comparable suppliers, compare public pricing models, and receive a challenger offer.

The current code is a working marketplace foundation with a Stripe sandbox import integration. The new GovCon REBID workflow is the next build milestone, not a completed feature.

## Current build status

Status reviewed 2026-09-12 against the repository and the supplied `on_the_fly_hackathon_build_plan.md`.

| Area | Current state | Remaining work |
|---|---|---|
| Stripe Financial Connections | Consent/session API, company binding, transaction imports, refresh polling, and UI implemented | Verify actual sandbox consent with configured keys |
| Financial data | Normalized transactions, fixture source, recurring-spend grouping and annualization implemented | Add GovCon ledger and verify its totals |
| Marketplace | Private dashboard, publish preview, profiles, listings, challenges, and comparison implemented for the cleaning demo | Adapt scope and comparison to DevSecOps; verify two-device bid flow |
| Evidence | Local checks and registry stub | USAspending supplier discovery, public rate inputs, Tavily enrichment |
| REBID | Planned | Orchestrated workflow, persisted progress, supplier results |
| AI | Anthropic dependency/configuration present; no completed reasoning workflow | New plan calls for OpenAI scope/evidence processing |
| Fly Scout | Planned P1 | Actual exploration output wired to qualified suppliers |
| UI | Basic existing screens and Stripe controls | Modern REBID-focused Spend → Progress → Market → Fly → Bid experience |
| Database | SQLite locally, SQLAlchemy and Alembic migrations | Supabase/Postgres remains optional deployment work |
| Demo readiness | Not yet ready for the new story | Finish P0/P1 and rehearse with labeled data |

Last verification (2026-09-12, after the justin-working review fixes): **313 backend tests passed**, frontend typecheck and production build passed, and migrations 0001–0011 applied to a fresh database matching the models. Stripe responses were mocked in tests; this does not certify a real sandbox connection or the new REBID flow.

## New demo and data strategy

Target buyer: **GovCon Industries**, a fictional company. Seed 3–6 months across DevSecOps, cybersecurity, program management, facilities, and logistics. Only **DevSecOps Engineering Support** needs the complete REBID path.

Stripe demonstrates consent and ingestion using Stripe's simulated bank data. The custom GovCon ledger is a separate fixture imported through the same normalized pipeline. It is not manufactured inside Stripe.

Required labels:

- **Stripe sandbox** — transactions returned by Stripe.
- **Hackathon demo ledger — synthetic buyer spend based on public procurement categories** — planned GovCon fixtures.
- **Modeled bid from public pricing — not a vendor quote** — future public-rate calculations.
- **Demo offer** or **genuine supplier quote**, according to the actual provenance of a submitted challenge.

The current seed still creates Apex Facilities Group and commercial-cleaning data. GovCon data is not implemented yet.

## Next build order

1. Verify Stripe sandbox consent; add GovCon fixtures and confirm annualized totals.
2. Add REBID and owner-confirmed DevSecOps scope.
3. Discover real suppliers through USAspending and preserve source evidence.
4. Build one defensible deterministic public-rate comparison.
5. Add Tavily enrichment and actual Fly Scout exploration.
6. Reuse challenges for a two-device submitted bid, then polish the UI and rehearse.

Notifications, automated outreach, payment movement, and real authentication are excluded from this hackathon slice. A genuine external quote is a bonus, not a dependency.

## Run locally

**One command (Windows):** from the repository root, run `.\run.ps1`. It needs Python 3.12+ and Node.js 20+. It creates `backend/.venv`, installs dependencies when they change, applies migrations, seeds the existing cleaning demo (`staged`) when the database has no transactions, starts both servers (app http://localhost:5173, API http://127.0.0.1:8000), and stops both on Ctrl+C. It reads `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` from a repo-root `.env` and passes them to the servers without printing them. Options: `-Reset` (destructive reseed; genuine offers kept in the ledger), `-Scenario live`, `-Source stripe`, `-NoBrowser`, `-BackendPort`/`-FrontendPort`. Logs go to `.run-logs/`.

**By hand:** use two PowerShell terminals from the repository root:

```powershell
cd backend
python -m pip install -e ".[dev]"
if (!(Test-Path .env)) { Copy-Item .env.example .env }
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run dev -- --host 127.0.0.1
```

For Stripe, set `STRIPE_SECRET_KEY=sk_test_...` in `backend/.env` and `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` in `frontend/.env`, from the same sandbox. Restart after changing environment files. `TRANSACTION_SOURCE=fixture` can remain the default; dedicated Stripe routes select their adapter explicitly.

Open the UI at http://127.0.0.1:5173 and API docs at http://127.0.0.1:8000/docs. A fresh database gets seeded company accounts on startup, but no expense history until an import or deliberate demo seed.

The existing `python -m app.cli.seed_demo` command is a **destructive reset** for the old cleaning scenario; stop the backend and back up data before using it. It also removes stored Stripe connections. It does not create the new GovCon demo.

## Documentation and structure

- [Current product plan](plan/plan1.md)
- [Current roadmap and completion gates](roadmap/README.md)
- [Backend setup](backend/README.md) and [frontend setup](frontend/README.md)
- [Stripe setup and limitations](backend/app/services/transactions/stripe/NOTES.md)
- [Project guide](CLAUDE.md) and [coding rules](.claude/codingrules.md)

Keep the existing `backend/app/services/`, `backend/app/api/`, `backend/app/models/`, and `frontend/src/features/` structure. The numbered roadmap files retain reusable technical detail from the earlier marketplace build; their status notices explain how they map to the current plan.
