# Phase 00 — Foundations, identity, and deploy skeleton

> Status reconciliation — 2026-09-12: Implemented locally: React/Vite, FastAPI, SQLite, Alembic, seeded demo accounts and money/provenance primitives. Supabase and public deployment are not established by this status. Reuse the foundation; do not rebuild it.
>
> Follow [the current P0/P1/P2 roadmap](README.md) and [current product plan](../plan/plan1.md). The earlier specification below is retained for reusable implementation detail. Its old priorities, demo category, and unchecked boxes are not a current completion report.

## Earlier component specification

**Goal:** an empty but *deployed* app and API, with multiple switchable accounts and the primitives every later phase depends on already decided and written down in code.

**Depends on:** nothing. **Size:** M. **Critical path:** yes.

Two calls here are non-obvious. **Deploy on day one, while there is nothing to deploy** — public profiles and listings have to be reachable over HTTPS by someone who isn't you, and discovering your deploy story at hour 30 is the most avoidable way to lose this demo. And **build the account switcher now**, because every screen from phase 04 onward is "what does *this* account see," and retrofitting that question into components built single-user is a rewrite.

## Steps

### 1. Repository skeleton

Create `frontend/` and `backend/` per [../CLAUDE.md](../CLAUDE.md).

```
backend/
  app/
    main.py              # FastAPI app factory, router registration, nothing else
    core/
      config.py          # env loading, read once, exported as a settings object
      money.py           # Money value type
      provenance.py      # provenance enums
      visibility.py      # visibility enum + the private-by-default constant
      identity.py        # current-account resolution
      errors.py          # error envelope + exception handlers
    api/
    services/
    models/
    db/
    workers/
  pyproject.toml
  .env.example

frontend/
  src/
    app/                 # router, layout shell, providers, account switcher
    features/
    shared/
      api/               # base fetch client, error handling
      components/
  index.html
  vite.config.ts
  .env.example
```

Commit `.env.example` with every variable named and no values.

### 2. Backend runs and answers

- FastAPI app factory in `app/main.py`; `GET /health` returns version, active `TRANSACTION_SOURCE`, and the seeded account count.
- `app/core/config.py` reads every env var **once** into a settings object. Nothing else touches the environment.
- Structured JSON logging with a request ID and the acting account ID. You will debug a challenger's failed submission without being able to ask them what happened.

### 3. Money primitive — before any amount exists

`app/core/money.py`: integer minor units, explicit currency, arithmetic that refuses to mix currencies, display formatting. Every amount uses it.

Write it now. Retrofitting after transactions, offers, and comparisons all use floats is a day you don't have.

### 4. Provenance primitive

`app/core/provenance.py`: two enums — financial data (`production | sandbox | imported | fixture`) and offer origin (`challenger-submitted | captured from an off-platform response | demo data`). Every evidence-bearing record carries one and every screen showing evidence displays it.

### 5. Visibility primitive — and its default

`app/core/visibility.py`: the enum (`private | scope_confirmed | public | closed | shortlisted`) and, more importantly, the rule that **private is the default and the fallback**.

Make it structurally hard to get wrong:

- The database column is `NOT NULL DEFAULT 'private'`.
- The model's constructor requires no argument to be private, and requires an explicit one to be anything else.
- There is no code path where being private depends on a computation succeeding.

This is three lines of care now that prevents the product's worst failure mode later.

### 6. Accounts, profiles, and the switcher

**One account type.** Every account is a business with a profile: name, service area, handle for its public URL.

- `app/models/account.py` — the account and its profile.
- `app/core/identity.py` — resolves the acting account for a request. For the hackathon, a header or cookie naming a seeded account ID. No passwords, no sessions, no signup.
- Seed 3–4 accounts in a fixture: one business with spend to publish, and two or three plausible challengers (a cleaning company, another service business).
- `frontend/src/app/AccountSwitcher.tsx` — a visible control to switch acting account.

The switcher is a demo instrument as much as a dev tool. On stage, "watch me become the cleaning company" is how the marketplace becomes legible in one gesture.

**Do not build authentication.** Not magic links, not Supabase Auth, not password reset. The plan settled this; every hour here is an hour not spent on the loop.

### 7. Database and migrations

- Provision the Supabase project; connection string in env.
- Pick a migration tool and commit the first migration, even if it only creates an extension. A migration path that exists from commit one is one you'll actually use.
- `app/db/session.py` owns connection and session lifecycle. No other module constructs a session.

### 8. Frontend shell

- Vite + React + TS, routes for the five screens as empty placeholders so every later phase has a URL to build into.
- `shared/api/client.ts` — base URL from env, acting-account header, error envelope parsing, typed request helper. Features call this; nothing calls `fetch` directly.
- Layout shell with the account switcher always visible.

### 9. Deploy both, publicly, over HTTPS

- API and app deployed and reachable; `GET /health` green from outside your network.
- **Confirm a public profile route works with no acting account at all** — `/p/:handle` rendering a placeholder for a logged-out stranger. That's the shape of the product's public surface, and it's worth proving before it carries real data.
- Wire deploy-target environment variables now, including ones later phases need.

### 10. Formatter, linter, coding rules in CI or a pre-commit hook

Committed config, defaults preferred, per [../.claude/codingrules.md](../.claude/codingrules.md).

## Done when

- [ ] `GET /health` responds from the deployed API over HTTPS.
- [ ] The deployed frontend reaches the deployed API.
- [ ] Switching accounts in the UI changes what the API returns.
- [ ] `/p/:handle` renders from the public internet with no acting account.
- [ ] `Money`, `Provenance`, and `Visibility` exist and are imported by at least one model.
- [ ] A record created with no visibility argument is private.
- [ ] One migration has been applied to the real database.
- [ ] `.env.example` lists every variable the app reads.

## Watch out for

- **Don't build auth.** Seeded accounts and a switcher. The only access control that matters: public pages are public, everything else is scoped to the acting account.
- **Don't let "acting account" be implicit.** Every query that touches owner data takes it as a parameter. A default that silently means "the first seeded account" will pass all your manual testing and leak on stage.
- Don't scaffold all five screens' components. Empty routes only.
- Don't let `config.py` grow feature logic.
