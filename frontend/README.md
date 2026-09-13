# Frontend

Local React + Vite frontend for the spend-transparency marketplace demo.

## Setup

```bash
cd frontend
npm install
cp .env.example .env
```

## Environment

- `VITE_API_URL`: backend base URL, defaults to `http://127.0.0.1:8000`. The backend's `CORS_ALLOW_ORIGINS` must include this app's origin.
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe sandbox publishable key (`pk_test_` only), required only for the "Connect Stripe sandbox" panel. See `backend/app/services/transactions/stripe/NOTES.md`.

## Start dev server

```bash
cd frontend
npm run dev
```

## Build

```bash
cd frontend
npm run build
```

## Demo identity

There is no auth. The bar at the top switches between the seeded businesses (`src/shared/account/demoAccounts.ts`, kept in sync with `backend/app/db/seed.py`) and **Public visitor**. A visitor sends no `X-Account-ID` header, so it sees exactly what a stranger's browser sees. A cold session with nothing stored starts as a public visitor, which is what makes a private window an honest "logged-out" view for the privacy proof. Switching business remounts the page, so nothing fetched as one business stays on screen as another.

## Deploying

Profile and listing URLs (`/p/:handle`, `/listings/:id`) must survive a browser refresh, so the static host needs an SPA fallback that serves `index.html` for unknown paths. `python -m app.cli.preflight --frontend …` checks this.
