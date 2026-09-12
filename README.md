# On the Fly

**List what you pay. Let anyone offer to beat it.**

On the Fly is a B2B marketplace built on voluntary price transparency. Connect your business account, see every expense in a private dashboard, and flip the ones you want public. Public expenses land on your profile, where any other business on the platform can see them and counter.

> A business publishes: *"we pay $2,400/month for commercial cleaning, 8,000 sq ft, 3× weekly."*
> A cleaning company browsing the marketplace replies: *"we'll do it for $1,875."*

Full design: [plan/plan1.md](plan/plan1.md). Build order: [roadmap/](roadmap/). Demo script: [roadmap/notes/demo-runbook.md](roadmap/notes/demo-runbook.md).

## Run it locally

On Windows, one command from the repo root starts the API and the web app:

```powershell
.\run.ps1
```

It needs Python 3.12+ and Node.js 20+. The first run creates `backend/.venv`, installs dependencies, migrates a local SQLite database, and seeds the demo. Later runs skip whatever hasn't changed. When both servers are up it opens the app:

| | |
|---|---|
| App | http://localhost:5173 |
| API | http://127.0.0.1:8000 (interactive docs at `/docs`) |
| Logs | `.run-logs/` |

Press Ctrl+C to stop both servers.

| Option | What it does |
|---|---|
| `-Reset` | Wipe and reseed the demo data. Genuine counteroffers are kept. |
| `-Scenario live` | Seed the live-demo state (everything private, nothing published) instead of the default `staged` state (a public cleaning listing with offers). |
| `-Source stripe` | Read transactions from the Stripe sandbox instead of labeled fixtures. |
| `-NoBrowser` | Don't open a browser. |
| `-BackendPort`, `-FrontendPort` | Use other ports. |

**Stripe sandbox (optional).** Put `STRIPE_SECRET_KEY` (an `sk_test_` key) and `STRIPE_PUBLISHABLE_KEY` (a `pk_test_` key) in a `.env` file at the repo root. `run.ps1` passes them to the two servers when it starts them and never prints or copies them. Only sandbox keys are accepted. Without them the fixture demo still works in full, and **Connect Stripe sandbox** asks for a sandbox key instead of connecting.

On macOS or Linux, follow [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) to start the two halves by hand.

**Demo identity.** There's no signup. The bar at the top switches between five seeded businesses and **Public visitor**, which sees exactly what a logged-out stranger sees.

## The loop

```
Connect business account
  → every expense appears in a private dashboard
  → toggle individual expenses public
  → public expenses appear on your profile
  → anyone on the platform browses and finds them
  → they click "Challenge" and submit a counteroffer
  → sealed by default, or open bidding if you flip it on
  → you compare offers, scope, and evidence against what you pay now
  → shortlist someone (not built yet)
```

Everything imports **private**. Nothing is ever published without you choosing it, previewing exactly what goes public, and clicking.

## Why inbound

The obvious version of this product is outbound: pick an expense, and the platform finds vendors and emails them a request for quotes. That needs discovery, qualification, and outreach infrastructure between a user and their first result, plus a lot of unsolicited email.

Publishing inverts it. The buyer takes one cheap action, and competitors come to them. The result is a browsable marketplace instead of a series of private auctions, and every listing is a standing invitation rather than a one-time request.

The tradeoff is a cold-start problem. That's why outbound discovery survives as a way to seed the supply side rather than as the main path.

## What it does today

- **Reads transaction history** through Stripe Financial Connections in sandbox mode, with clearly labeled fixtures for the recurring spend the sandbox doesn't contain. Every figure carries its provenance (`sandbox` or `fixture`). Production financial data is post-MVP.
- **Shows every expense** grouped by vendor, with detected cadence, annualized cost, and the individual payments behind each figure. Transfers, payroll, and taxes are never publishable.
- **Confirms scope before publishing**, because nobody can meaningfully counter a price with no scope attached. The owner fills in the scope, and fields they leave unanswered stay explicit questions.
- **Publishes to a public profile** with a preview of the exact payload, and unpublishes instantly.
- **Takes counteroffers from any business on the platform**, revisable until the deadline, with full revision history.
- **Opens the bidding if you want it.** Offers are sealed by default: you see them and nobody else does. With open bidding on, challengers see each other's prices and scope and can underbid, but only you see who they are. Turning it on never exposes an offer someone already made in confidence.
- **Shows who's offering**, with each check's source, timestamp, and limits. Checks that don't run yet, such as registry and exclusion-list lookups, are listed as *not checked* instead of being hidden.
- **Compares on normalized cost and scope**, not price alone, and traces every savings figure down to the transactions behind it.
- **Reads spend with fruit-fly-inspired circuits.** Compound Eye separates a real price change from a one-off charge, so the baseline is what you pay now. Mushroom Body flags unusual charges, suggests duplicate vendors to merge, and finds similar public listings. These are deterministic code, not an AI model, and they're labeled "Fly brain" wherever they appear. Vendors merge only when you confirm.

**Not built yet:** shortlisting, AI scope drafting and offer extraction, registry and reputation checks, outbound invitations, and real authentication.

## The two rules everything else follows from

**Private is the default and the fallback.** Every expense imports private. An expense whose visibility state is ambiguous, unset, or errored is private. The public projection is built explicitly, field by field, never by filtering the private record: a serializer that starts rich and removes fields leaks the next field someone adds.

**Not checked is not the same as clean.** An unavailable source means *not checked*. A search that returns nothing means *no match found in this source*, never "proven safe." Adverse records never attach to a business on a name match alone. There is no blanket "verified" badge.

Savings are **potential** until a switch actually happens, and the UI says so.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript, Vite |
| Backend | Python + FastAPI, Pydantic, SQLAlchemy + Alembic |
| Database | SQLite locally; Postgres via Supabase when deployed |
| Identity | One account type; seeded demo accounts with an in-app switcher |
| Financial data | `TransactionSource` adapter: Stripe Financial Connections sandbox, with labeled fixtures as the deterministic fallback |
| Fly-brain analysis | Compound Eye (contrast adaptation) and Mushroom Body (FlyHash, novelty filter), in pure Python |
| Updates | Polling |
| Planned | Claude for scope drafting, offer extraction, and evidence summaries; Tavily for discovery (secondary path); a background worker for imports and evidence |

Monetary math, deduplication, deadlines, visibility state, and offer versioning are deterministic code. When the model arrives, it will draft and extract. It won't calculate, and it won't decide what's public.

## Status

MVP built and in demo polish. The publish → challenge → compare loop runs end to end, and `run.ps1` starts it locally. [roadmap/](roadmap/) tracks each phase's done-when criteria, and [plan/plan1.md](plan/plan1.md) records the scope decisions.

Two earlier concepts are out of scope: an equipment-shopping and camera-audit product, and an outbound RFQ product with token-scoped vendor invitations. The first concept's fruit-fly neural models are back in scope, now running on spend data instead of camera frames.

## Repo layout

```
run.ps1     Starts the backend and frontend together (Windows PowerShell)
frontend/   React + TS app (Vite)
backend/    FastAPI app, migrations, demo seed and preflight CLIs, tests
plan/       Design docs; plan1.md is the plan of record
roadmap/    Phase-by-phase build order, plus the demo runbook in notes/
.claude/    Claude Code config and coding rules
```
