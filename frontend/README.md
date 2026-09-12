# Frontend

React + TypeScript + Vite for On the Fly. The current UI includes the private dashboard, Stripe sandbox controls, publish/preview, profiles, marketplace, challenge form and comparison inbox.

The REBID progress, public supplier market, Fly Scout screens, and GovCon visual redesign are planned in [the roadmap](../roadmap/README.md). Existing screens still use the earlier cleaning demo.

## Setup (PowerShell)

From the repository root:

```powershell
cd frontend
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173 with the backend running on port 8000.

## Environment

- `VITE_API_URL`: defaults to `http://127.0.0.1:8000`.
- `VITE_STRIPE_PUBLISHABLE_KEY`: `pk_test_...` from the same sandbox as the backend secret key.

Restart Vite after changes. Only publishable keys belong here; never add the Stripe secret key to a `VITE_` variable.

Select a demo company, click **Connect Stripe sandbox**, and select one simulated checking account. Refresh polls for up to two minutes. Imported transactions display sandbox provenance, dates, amounts, direction and status. Company switching reloads the app to clear private state.

## Routes

| Route | Current purpose |
|---|---|
| `/` | Private spend dashboard and Stripe connection |
| `/publish` | Scope/disclosure/public preview |
| `/marketplace` | Published listings |
| `/listings/:id` | Listing detail |
| `/listings/:id/challenge` | Submit an offer |
| `/listings/:id/inbox` | Owner comparison/inbox |
| `/p/:handle` | Public profile |

## Verification

```powershell
npm run build
```

The frontend build passed in the previous Stripe implementation check. This verifies compilation, not real consent, two-device bidding, or the planned REBID UI.
