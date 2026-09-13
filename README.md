# On the Fly

**REBID what your business already pays for, post what it newly needs, and split off the pieces that save money.**

On the Fly is a task market:
1. A business connects its accounts, finds replaceable spend, and posts it as a task, or posts new work it needs.
2. Other businesses bid. When the poster accepts an offer, the winning bidder owns the task.
3. Any task owner can split off pieces. **Ways to save** suggests only the pieces where public contract history and labor rates say splitting is cheaper.
4. Each piece is its own task, owned by whoever wins it, and can be split again.

The current code is a working marketplace foundation with a Kalshi-style task-market UI, a Stripe sandbox import integration and owner-approved supplier invitations. REBID, task ownership and splitting are the next build milestones, not completed features.

## Current build status

Status reviewed 2026-09-13 against the repository, [the current plan](plan/plan2.md) and [roadmap](roadmap/README.md).

| Area | Current state | Remaining work |
|---|---|---|
| Stripe Financial Connections | Consent/session API, company binding, transaction imports, refresh polling, and UI implemented | Verify actual sandbox consent with configured keys |
| Financial data | Normalized transactions, fixture source, recurring-spend grouping and annualization implemented | Add GovCon ledger and verify its totals |
| Marketplace | Publish stepper with exact preview, market board, market page with bid ticket, offers with revisions and sealed/open bidding, Offers inbox, comparison and profiles, on cleaning demo data | Requirements and category templates; per-requirement offer responses; accepting an offer |
| Task ownership and splitting | Planned ([roadmap 12](roadmap/12-task-ownership-and-splitting.md)) | Poster and task owner, cuts, splits, Ways to save, money views |
| Evidence | Local checks and registry stub | USAspending awards and subawards, public labor rates, Tavily enrichment |
| Outreach | Owner-approved invitations, sandbox outbox by default, public opt-out page | Live Tavily and SMTP verification; delivery tracking |
| REBID | Planned | Workflow, persisted progress, confirmed requirements, supplier results |
| AI | Anthropic dependency/configuration present; no completed reasoning workflow | OpenAI for requirement tags, hour estimates and split drafts; never money or identity |
| Fly | `flybrain` circuits label their results on Spend and similar listings | Fly Scout and FlyHash award ranking after splitting, labeled at each result |
| UI | Task market with light/dark/system themes ([roadmap 11](roadmap/11-usability-and-dark-mode.md)) | My work, split drawer, Ways to save; keyboard focus and honesty-label audit |
| Database | SQLite locally, SQLAlchemy and Alembic migrations 0001–0012 | Supabase/Postgres remains optional deployment work |
| Demo readiness | Not yet ready for the current story | Finish P0/P1 and rehearse three accounts with labeled data |

Last reported verification (2026-09-13, at the task-market UI and outreach merge): **360 backend tests passed**, and the frontend build passed with the colour and contrast checks. Stripe, Tavily and SMTP responses were mocked in tests. This does not certify a real sandbox connection, live outreach, or the planned REBID and splitting flows.

## Demo and data strategy

Target buyer: **GovCon Industries**, a fictional company. Seed 3–6 months across DevSecOps, cybersecurity, program management, facilities, and logistics. Only **DevSecOps Engineering Support** needs the complete path.

Demo accounts:
- **GovCon Industries** posts the REBID.
- **Prime A** wins it and splits off a piece.
- **Sub B** wins that piece and can split it again.

All three are demo identities with labeled fixture rates.

Stripe demonstrates consent and ingestion using Stripe's simulated bank data. The custom GovCon ledger is a separate fixture imported through the same normalized pipeline. It is not manufactured inside Stripe.

Required labels:

- **Stripe sandbox** — transactions returned by Stripe.
- **Hackathon demo ledger — synthetic buyer spend based on public procurement categories** — planned GovCon fixtures.
- **Modeled bid from public pricing — not a vendor quote** — public-rate estimates for a whole task.
- **Modeled cut from public pricing — not an offer** — Ways to save cards.
- **Subcontract** — pieces split from an accepted task.
- **Demo offer** or **genuine supplier quote**, according to the actual provenance of a submitted offer.

The current seed still creates Apex Facilities Group and commercial-cleaning data. GovCon data is not implemented yet.

## Next build order

1. Verify Stripe sandbox consent; add GovCon fixtures and confirm annualized totals.
2. Add tasks with poster and task owner, requirements with category templates, and offer acceptance.
3. Add REBID with owner-confirmed DevSecOps requirements, and `new` tasks.
4. Add cuts, manual splits, piece visibility and the payer chain.
5. Connect USAspending and public labor rates as market evidence; add cost basis rates, Ways to save and money views.
6. Add Split everything and Tavily, then Fly Scout, then rehearse on three devices.

Notifications, automatic sending, payment movement, contracts and real authentication are excluded from this hackathon slice. Invitations send only with owner approval. A genuine external quote is a bonus, not a dependency.

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

- [Current product plan](plan/plan2.md), with [plan1](plan/plan1.md) retained for REBID detail
- [Current roadmap and completion gates](roadmap/README.md)
- [Task ownership and splitting build spec](roadmap/12-task-ownership-and-splitting.md)
- [Backend setup](backend/README.md) and [frontend setup](frontend/README.md)
- [Stripe setup and limitations](backend/app/services/transactions/stripe/NOTES.md)
- [Project guide](CLAUDE.md) and [coding rules](.claude/codingrules.md)

Keep the existing `backend/app/services/`, `backend/app/api/`, `backend/app/models/`, and `frontend/src/features/` structure. The numbered roadmap files retain reusable technical detail from the earlier marketplace build; their status notices explain how they map to the current plan.
