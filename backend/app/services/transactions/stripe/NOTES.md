# Stripe Financial Connections integration notes

Stripe Financial Connections sandbox is the sole external financial-data provider for the hackathon MVP. Fixtures remain available for deterministic demo expenses.

## Implementation contract

- Create Financial Connections Sessions on the backend using a Stripe sandbox secret key.
- Request only `transactions` permission; balances are deferred from this minimal implementation.
- Launch the Stripe-hosted account-linking flow from the frontend using the returned client secret.
- Import transactions only after Stripe reports a successful refresh.
- Poll refresh status through `/api/connections/stripe/sync` for at most two minutes in the UI. Webhooks and scheduled refreshes are deferred.
- Map provider amounts, direction, timestamps, status, and currency once at the adapter boundary.
- Store provider identifiers and secret API keys on the backend. Return only the session client secret to the acting company for Stripe.js.
- Label imported records `sandbox`; label checked-in fallback records `fixture`.

## Local setup and verification

1. Set `STRIPE_SECRET_KEY=sk_test_...` in `backend/.env`.
2. Set `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` in `frontend/.env`, from the same Stripe sandbox.
3. Run `python -m alembic upgrade head` in `backend/`, then restart both servers.
4. On the dashboard click **Connect Stripe sandbox** and select exactly one simulated checking account.
5. Consent completion imports transactions when Stripe's refresh succeeds. If it takes longer than two minutes, use **Refresh transactions** to resume.
6. Expand the imported transaction list for dates, descriptions, amounts, direction and status. Settled debits feed the expense dashboard; pending/void entries are retained for inspection.

`TRANSACTION_SOURCE=fixture` may remain set: the dedicated Stripe routes explicitly select the Stripe adapter. Existing fixture imports remain available separately and retain their provenance. No webhook key or balance permission is needed.

The REST client pins API version `2024-06-20`, uses timeouts, and rejects live keys and live responses. Negative transaction amounts are outflows; positive amounts are credits. Imports update existing provider IDs as statuses or amounts change.

The database migration adds only the connection table. It does not reset demo data. The company switcher is demo identity, not production authentication, so this feature accepts sandbox data only.

Automated tests mock Stripe at the HTTP boundary and cover pagination, repeat imports, pending-to-posted and void changes, ownership, two-company isolation, failed refreshes, rate limits, and rejection of live credentials/data. The real consent flow and exact simulated institution contents still need verification with the user's sandbox keys.

References: [Stripe data collection](https://docs.stripe.com/financial-connections/other-data-powered-products), [transactions](https://docs.stripe.com/financial-connections/transactions), [sandbox testing](https://docs.stripe.com/financial-connections/testing).
