# Phase 02 — Financial ingestion

> Status reconciliation — 2026-09-12: Stripe transaction-only sandbox sessions, company binding, imports, status updates, polling and UI are implemented with mocked-provider tests. Actual sandbox consent remains unverified. Add the separate GovCon fixture ledger next. Useful custom Stripe transactions are not a dependency; balances/webhooks remain deferred.
>
> Follow [the current P0/P1/P2 roadmap](README.md) and [current product plan](../plan/plan2.md). The earlier specification below is retained for reusable implementation detail. Its old priorities, demo category, and unchecked boxes are not a current completion report.

## Earlier component specification

**Goal:** normalized, deduplicated, account-scoped transaction records in the database — from Stripe Financial Connections sandbox and from labeled fixtures, behind one interface neither the UI nor any service can tell apart.

**Depends on:** [00](00-foundations.md). **Size:** L. **Critical path:** yes.

Everything imported here is **private and owner-scoped**. Nothing in this phase produces anything another account can see; publication is an explicit owner action in [04](04-visibility-and-profiles.md).

## Steps

### Minimal sandbox implementation status

Implemented: transaction-only Stripe consent sessions, company/account binding, paginated imports, updating existing transaction statuses and amounts, bounded refresh polling, private transaction inspection, and dashboard refresh. The migration is `0008_financial_connections`.

Balances, webhooks, and scheduled refreshes below are deferred from this minimal slice. The dedicated Stripe endpoints work alongside the fixture default. See [setup and verification notes](../backend/app/services/transactions/stripe/NOTES.md). Automated mocked-provider tests pass; real sandbox consent remains unverified until keys are configured. Do not mark the full phase complete on that basis.

### 1. Spike Stripe Financial Connections sandbox first

Before writing the adapter, answer against the actual API and its documentation:

- How is a Financial Connections Session created and completed from the frontend?
- Which permissions are required for transactions and balances, and how are they disclosed to the user?
- How do transaction refreshes, pagination, and webhook completion events work?
- What fields come back — description, status, timestamps, currency, and account identifiers?
- What is the amount's sign convention and unit? Cents or dollars, negative for debits or not?
- **What is actually in Stripe's simulated accounts?** Any recurring service payments matching the demo?

Write the answers into `backend/app/services/transactions/stripe/NOTES.md`. Verify against Stripe's current documentation and actual sandbox responses before treating assumptions as dependencies.

Timebox it. If the sandbox holds nothing resembling recurring service spend, fixtures remain the deterministic demo path. The Stripe connection still demonstrates the real consent and import flow, and every record is labeled `sandbox` or `fixture` on screen.

### 2. Normalized transaction model

`backend/app/models/transaction.py` — one record, source-agnostic:

| Field | Notes |
|---|---|
| `owner_account_id` | Which platform account this belongs to. Required, indexed, on every query |
| `provider`, `provider_account_id`, `provider_transaction_id` | Composite natural key for deduplication |
| `source_type` | `production \| sandbox \| imported \| fixture` |
| `raw_description` | Exactly as received, never overwritten |
| `normalized_vendor` | Derived in phase 03, nullable here |
| `amount` | `Money` — integer minor units + currency |
| `direction` | Debit or credit, resolved from the provider's sign convention |
| `posted_at`, `status` | Date and settlement state |
| `category`, `memo`, `counterparty` | Optional, provider-dependent |
| `raw_payload` | The original record, retained |

`raw_description` and `raw_payload` are never mutated. Everything derived lives in its own column so a bad derivation can be recomputed.

**A transaction is never publishable.** Raw payment records are permanently private — only the derived expense summary can ever be published, and only through [04](04-visibility-and-profiles.md). Don't give this model a visibility field; the absence of one is the guarantee.

### 3. The `TransactionSource` interface

`backend/app/services/transactions/source.py` — the protocol, and nothing else:

```python
class TransactionSource(Protocol):
    def list_transactions(
        self, provider_account_id: str, since: date, until: date
    ) -> list[NormalizedTransaction]: ...
```

Per the coding rules: implementations live in their own modules, and only the composition point imports a concrete one.

### 4. `StripeFinancialConnectionsSource`

`backend/app/services/transactions/stripe/source.py`. Handles transaction pagination and mapping into the normalized model after the user completes the Stripe-hosted consent flow. Sign-convention and unit conversion happen **here**, at the edge, so nothing downstream ever sees a provider quirk.

Add server endpoints to create a Financial Connections Session and receive Stripe webhooks. Request only the `transactions` and `balances` permissions needed by the product. Store Stripe account and session identifiers server-side; never expose the secret key in the frontend. Treat refresh completion as asynchronous and make webhook processing idempotent.

Specific errors, never a bare catch. An unreachable provider surfaces as an import failure the UI can display, not as an empty result that looks like "no transactions."

### 5. `FixtureSource`

`backend/app/services/transactions/fixture/source.py`, reading committed JSON fixtures that emit the identical normalized shape — including at least one clean recurring service payment with a stable cadence, since that's what phase 03 needs to find.

Every fixture record carries `source_type = fixture`. The plan requires demo data to be visibly labeled; enforcing it at the source means no later screen can accidentally omit it.

### 6. Selection by environment variable

One composition point — `backend/app/services/transactions/factory.py` — reads `TRANSACTION_SOURCE` from the settings object and returns the implementation. Comment it with which one is active and why, per the coding rules.

### 7. Import pipeline

`backend/app/services/transactions/import_run.py`: fetch → normalize → deduplicate → classify → persist.

- **Deduplicate** on `(provider, provider_account_id, provider_transaction_id)`. Re-running an import must be a no-op, not a doubling. Test this by running it twice.
- **Exclude from eligible spend:** transfers between own accounts, payroll, taxes. Mark them excluded with a reason rather than dropping them — an expense the user can't find because it was silently filtered is worse than one shown as ineligible.
- **Reconcile reversals and refunds** against their original so spend isn't inflated.
- **Keep currencies separate.** No conversion without an explicit supplied basis.
- Persist an `ImportRun` record: source, window, counts (fetched / new / duplicate / excluded), errors, timestamp.

### 8. API and screen

- `backend/app/api/connections/` — trigger an import, list import runs and their status. Scoped to the acting account.
- `backend/app/api/transactions/` — list transactions with their provenance and exclusion state. Scoped to the acting account.
- `frontend/src/features/connections/` — connect/import control, import status, and a raw transaction list.

The transaction list matters for the demo: it's the evidence behind every later claim, and clicking from a listing back to the actual payments is what makes the product credible.

**Every query filters by acting account.** Not "usually" — every one. This is the phase where that habit gets set, and the phase where getting it wrong is still cheap to fix.

## Done when

- [ ] Stripe sandbox findings are written down, including whether recurring service spend exists.
- [ ] A user can complete the Stripe Financial Connections sandbox consent flow.
- [ ] `StripeFinancialConnectionsSource` returns normalized records after a completed transaction refresh.
- [ ] Stripe webhook signatures are verified and repeat delivery is idempotent.
- [ ] `FixtureSource` returns the same shape, labeled `fixture`.
- [ ] Flipping `TRANSACTION_SOURCE` changes the data with no other code change.
- [ ] Running the same import twice produces zero new rows the second time.
- [ ] Transfers, payroll, and taxes are marked excluded with a visible reason.
- [ ] The UI shows imported transactions with their source label.
- [ ] Switching to another account shows that account's transactions and none of the first's.

## Watch out for

- **Amount sign and unit bugs are the classic loss here.** Convert once, at the adapter, and comment the convention where you do it.
- Don't let the fixture drift from the normalized shape. If `StripeFinancialConnectionsSource` gains a field, the fixture gains it too, or phase 03 works against one source and breaks against the other.
- Don't build vendor normalization here. It belongs to phase 03 and it is not a one-liner.
- Don't give transactions a visibility field, however convenient it looks. Raw payments are permanently private.
- Resist storing amounts as floats "just for now."
