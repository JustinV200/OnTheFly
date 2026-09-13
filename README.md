# On the Fly

> **The contract auction house for business spend.**

On the Fly turns an expense or a new business need into a competitive market. A buyer defines the outcome and the price to beat, qualified vendors bid for the work, and the winner can deliver it or split pieces back into the market for specialist subcontractors.

Built for a hackathon, the project asks a simple question: **what if buying business services were as transparent and competitive as trading in a market?**

## What we built

- **Spend-to-auction:** connect a Stripe sandbox or use the labeled demo ledger, identify recurring spend, and turn it into a REBID opportunity.
- **AI-assisted scoping:** convert a rough business need into structured requirements and estimated hours for the owner to review.
- **Public supplier discovery:** use similar USAspending contract history to find relevant vendors, with optional Tavily enrichment for outbound research.
- **Competitive bidding:** invite selected suppliers or publish to the marketplace, receive sealed or open offers, compare them, and accept a winner.
- **Transferable work ownership:** accepting an offer makes the vendor the task owner. That vendor can split the contract into smaller pieces and auction those pieces to subcontractors.
- **Traceable savings:** preserve the chain from original expense to scope, bids, accepted vendor, subcontracted pieces, and modeled savings.

The result is more than a lead marketplace. It is a recursive contract market: work can move from buyer to prime contractor to specialist subcontractor while every bid, requirement, owner, and dollar remains visible.

## How the demo works

1. **Connect spend.** GovCon Industries imports its transaction history and spots a recurring DevSecOps contract worth rebidding.
2. **Create the market.** The expense becomes a scoped contract with requirements, a budget, and a price to beat.
3. **Find bidders.** Similar public awards identify potential suppliers; Tavily can enrich the shortlist before the buyer approves outreach.
4. **Run the auction.** Vendors submit offers and the buyer accepts the strongest bid, transferring ownership of the work.
5. **Subcontract a piece.** The winning prime splits off specialist work, republishes it, and accepts a subcontractor's offer.
6. **Follow the money.** The task trace and account views show who owns each piece and where savings were created.

And the fly? We wanted to make this system so simple that even a fly could use it. So we made the fly part of the experience: a simulated fruit-fly brain reacts alongside marketplace results. **We made contracting so simple, a fly can use it. In fact, it does.** The fly is a clearly labeled hackathon experiment and never makes financial decisions or gates which offer a user can accept.

## Why it matters

Business service purchasing is fragmented across bank transactions, procurement workflows, vendor discovery, email outreach, and subcontracting. On the Fly brings that loop into one place so companies can:

- discover waste in spend they already have;
- create price competition instead of silently renewing contracts;
- give smaller and specialist vendors a path into larger contracts;
- break complex work into pieces without losing accountability; and
- show the evidence behind supplier discovery, bids, ownership, and savings.

## Tech stack

React, TypeScript and Vite power the marketplace UI. FastAPI, Python, SQLAlchemy and Alembic provide the API, business workflows and persistence. Stripe sandbox data demonstrates financial-account ingestion; OpenAI assists with scope drafting; USAspending provides public contract evidence; and Tavily enriches outbound supplier research. The local demo runs on SQLite and can move to Postgres for deployment.

## Demo and data strategy

Target buyer: **GovCon Industries**, a fictional company, with five private monthly services (DevSecOps, cybersecurity, program management, facilities, logistics). Only **DevSecOps Engineering Support** takes the complete path.

Demo accounts, seeded on startup and listed first in the account menu:
- **GovCon Industries** (`acc_govcon_1`) posts the REBID.
- **Prime A** (`acc_prime_a`) wins it and splits off a piece.
- **Sub B** (`acc_sub_b`) wins that piece and can split it again.

All three are demo identities with labeled fixture rates.

Stripe demonstrates consent and ingestion using Stripe's simulated bank data. The GovCon ledger is a separate fixture imported through the same normalized pipeline. It is not manufactured inside Stripe.

Required labels:

- **Stripe sandbox** — transactions returned by Stripe.
- **Hackathon demo ledger — synthetic buyer spend based on public procurement categories** — the GovCon fixtures.
- **Modeled bid from public pricing — not a vendor quote** — public-rate estimates for a whole task.
- **Modeled cut from public pricing — not an offer**, or **Modeled cut from demo market data — not an offer** while the mock market-data source is in use — Ways to save cards.
- **Subcontract** — pieces split from an accepted task.
- **Demo offer** or **genuine supplier quote**, according to the actual provenance of a submitted offer.
- **Simulated fly brain · a toy, not advice** — every fly-influenced result.

Seeding, all from `backend/` after migrations:

- `python -m app.cli.seed_govcon_demo` adds GovCon Industries' ledger without resetting other accounts or Stripe connections: 30 synthetic March–August 2026 invoices across five services, $4,044,000 annualized. See [GOVCON.md](backend/app/services/transactions/fixture/GOVCON.md).
- `python -m app.cli.seed_task_chain --stage <stage>` stages the DevSecOps chain through the real services. Stages in order: `start`, `rebid_published`, `prime_offer`, `prime_owns`, `piece_published`, `sub_offer`, `sub_owns`. The `/demo` guide and presenter rail call the same staging, gated by `DEMO_CONTROLS_ENABLED`; it refuses to overwrite a genuine offer.
- `python -m app.cli.seed_demo --scenario staged|live` is a **destructive reset** of the older commercial-cleaning scenario (Apex Facilities Group); stop the backend and back up data before using it. It also removes stored Stripe connections.
- `python -m app.cli.preflight --api <url> --frontend <url>` runs the read-only half of the pre-demo checklist.

## Next build order

1. Verify Stripe sandbox consent; check the seeded GovCon ledger's displayed totals and labels.
2. Add a public labor-rate client so live market evidence can price cuts, and REBID's Progress → Market → Bid steps inside the expense's REBID page.
3. Add Split everything (LLM split draft with model and prompt provenance) and verify Tavily enrichment live.
4. Add Fly Scout, labeled at each result, after the splitting path.
5. Run the accessibility and honesty-label audit on My work, the split drawer and Ways to save, then rehearse on three devices.

Notifications, automatic sending, payment movement, contracts and real authentication are excluded from this hackathon slice. Invitations send only with owner approval. A genuine external quote is a bonus, not a dependency.

## Run locally

**One command (Windows):** from the repository root, run `.\run.ps1`. It needs Python 3.12+ and Node.js 20+. It creates `backend/.venv`, installs dependencies when they change, applies migrations, seeds the cleaning demo (`staged`) when the database has no transactions, starts both servers (app http://localhost:5173, API http://127.0.0.1:8000), and stops both on Ctrl+C. It reads `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` from a repo-root `.env` and passes them to the servers without printing them. Options: `-Reset` (destructive reseed; genuine offers kept in the ledger), `-Scenario live`, `-Source stripe`, `-NoBrowser`, `-BackendPort`/`-FrontendPort`. Logs go to `.run-logs/`. Run the GovCon seeds above afterwards for the task-chain demo.

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

Open the UI at http://127.0.0.1:5173 and API docs at http://127.0.0.1:8000/docs. A fresh database gets seeded company accounts on startup, but no expense history until an import or deliberate demo seed.

Environment switches in `backend/.env.example`, all optional:

| Variable | Default | Effect |
|---|---|---|
| `STRIPE_SECRET_KEY` (+ `VITE_STRIPE_PUBLISHABLE_KEY` in `frontend/.env`) | empty | Enables the Stripe sandbox connect flow; both keys from the same sandbox |
| `TRANSACTION_SOURCE` | `fixture` | Default transaction adapter; Stripe routes select theirs explicitly |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | empty | AI requirement drafting for `new` tasks; empty means "not run" |
| `DISCOVERY_SOURCE`, `TAVILY_API_KEY` | `fixture` | `fixture`, `tavily` or `usaspending_tavily` supplier discovery |
| `MARKET_DATA_SOURCE` | `mock` | `mock` (labeled demo data) or `live` (USAspending, no key needed) |
| `OUTREACH_CHANNEL`, `SMTP_*`, `OUTREACH_RECIPIENT_ALLOWLIST`, `OUTREACH_POSTAL_ADDRESS` | `sandbox` | Invitations stay in the sandbox outbox unless `smtp` is set with an allowlist and postal address |
| `SAVINGS_MIN_BASIS_POINTS`, `SAVINGS_MIN_ANNUAL_MINOR`, `SAVINGS_MIN_SUPPLIERS`, `SAVINGS_LOOKBACK_YEARS`, `MAX_SUGGESTED_PIECES_PER_TASK` | see file | Ways to save thresholds, printed on every card |
| `DEMO_CONTROLS_ENABLED` | `true` | Presenter staging controls; set `false` on shared databases |

Restart after changing environment files.

Frontend checks: `npm run build` (runs `tsc` first), `npm run check:colors`, `npm run check:contrast`. Backend tests: `python -m pytest` from `backend/`.

## Documentation and structure

- [Current product plan](plan/plan2.md), with [plan1](plan/plan1.md) retained for REBID detail
- [Current roadmap and completion gates](roadmap/README.md)
- [Task ownership and splitting build spec](roadmap/12-task-ownership-and-splitting.md)
- [Backend setup](backend/README.md) and [frontend setup](frontend/README.md)
- [Stripe setup and limitations](backend/app/services/transactions/stripe/NOTES.md)
- [GovCon demo ledger](backend/app/services/transactions/fixture/GOVCON.md)
- [Project guide](CLAUDE.md) and [coding rules](.claude/codingrules.md)

Frontend features live under `frontend/src/features/`: Spend (`dashboard`), `connections`, `publish`, `marketplace`, My listings (`listings`), `invitations`, `profile`, `challenge`, Offers (`inbox`), `trace`, task pages (`tasks`), the split drawer (`split`), Ways to save (`savings`), cost basis rates (`rates`), My work (`work`), the demo guide (`demo`) and the simulated fly brain (`brainview`). Keep the existing `backend/app/services/`, `backend/app/api/`, `backend/app/models/`, and `frontend/src/features/` structure. The numbered roadmap files retain reusable technical detail from the earlier marketplace build; their status notices explain how they map to the current plan.
