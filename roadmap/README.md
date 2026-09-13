# On the Fly — Current Build Roadmap

Updated 2026-09-12. Follow this order for the [current REBID plan](../plan/plan1.md). Preserve the existing marketplace implementation; the numbered files below are reusable component specifications from the previous build order.

## Where we are

| Capability | Evidence in repository | Status |
|---|---|---|
| App foundation | React features, FastAPI routes, SQLAlchemy models, Alembic migrations | Implemented locally |
| Stripe sandbox ingestion | `transactions/stripe/`, `api/connections/`, frontend connection controls, mocked HTTP tests | Implemented; real sandbox consent unverified |
| Expense pipeline | Fixture source, normalization, recurrence, baseline and expense API | Implemented for existing data; GovCon validation pending |
| Publishing and profiles | Scope form, exact preview, public projections and visibility tests | Reuse; cleaning-specific scope needs adaptation |
| Challenges/comparison | Submission/revisions, sealed/open rules, inbox and deterministic math | Reuse; new two-device GovCon demo pending |
| Evidence/outreach | Local evidence logic; registry and invitation stubs | External integrations missing |
| New REBID experience | No GovCon/REBID/USAspending/public-rate/Fly Scout implementation found | Not started |

Last verified implementation result: **39 backend tests passed; frontend build passed**. This is the previous Stripe implementation check, not a fresh end-to-end acceptance run for the new plan. Existing checklists must not be marked complete merely because routes or files exist.

## P0 — Next work

- [ ] Verify Stripe sandbox consent with configured keys and confirm imported transactions render.
- [ ] Add GovCon Industries and `fixture_govcon_main` through the existing normalized pipeline.
- [ ] Seed 3–6 months across five categories; verify rounded display values against exact arithmetic.
- [ ] Label synthetic GovCon data separately from Stripe sandbox data.
- [ ] Add REBID action and persisted/recoverable progress for one DevSecOps expense.
- [ ] Draft/confirm scope, labor mix, hours, location, clearance and classification inputs.
- [ ] Connect USAspending; return real suppliers and preserve award identifiers/source evidence.
- [ ] Apply deterministic qualification and deduplication.
- [ ] Integrate one usable public labor-rate path and explain comparability assumptions.
- [ ] Display deterministic modeled annual cost and potential savings with the model/quote distinction.

**Gate:** Spend → REBID → actual suppliers → cited public pricing → modeled savings.

## P1 — Complete the planned demo

- [ ] Enrich shortlisted suppliers through Tavily and source-backed LLM summaries.
- [ ] Select and run the Fly Scout implementation on qualified candidates.
- [ ] Record actual fly output and map it to the supplier selected for deeper research.
- [ ] Adapt existing listing/challenge/comparison models and forms to DevSecOps.
- [ ] Submit a challenge from another browser/device and update the buyer view.
- [ ] Distinguish a teammate demo offer from a genuine supplier quote.
- [ ] Apply the modern UI system across Spend, Progress, Market, Fly and Bid.
- [ ] Rehearse in a fresh browser, exercise API failure states, and record a backup.

A genuine external quote is optional. Notifications and automated email outreach are not required. Manual sharing of the listing is sufficient.

## P2 — Only after P0/P1 are stable

Tool-selecting agent orchestration, fly learning/rewards, SAM.gov if needed beyond USAspending, broader categories/pricing, more banks, production auth, and deployment expansion. A fixed orchestration sequence remains sufficient for P0.

## Existing phase documents: reuse map

| File | Reuse now | Change under the new plan |
|---|---|---|
| [00 Foundations](00-foundations.md) | App, money/provenance, accounts, migrations | Do not restart scaffolding; hosting is not the first gate |
| [01 Real counteroffer](01-real-counteroffer-path.md) | Evidence/provenance guidance for genuine quotes | Optional bonus, no longer critical path |
| [02 Ingestion](02-financial-ingestion.md) | Stripe and fixture pipeline | Verify Stripe; add GovCon fixtures; no custom Stripe ledger dependency |
| [03 Dashboard](03-expense-dashboard.md) | Grouping/recurrence/annualization | GovCon spend and REBID entry |
| [04 Visibility/profiles](04-visibility-and-profiles.md) | Private defaults, exact preview, scope versions | DevSecOps scope; private research before publish |
| [05 Marketplace/challenges](05-marketplace-and-challenges.md) | Browse, submit, revise, sealed/open controls | Wire discovered suppliers into existing challenge path |
| [06 Comparison](06-counteroffer-comparison.md) | Deterministic normalization and scope differences | Add separate public-rate modeled estimates |
| [07 Evidence](07-challenger-evidence.md) | Source/status conventions | USAspending P0; Tavily P1; no blanket verification |
| [08 Invitations](08-outbound-invitations.md) | Future approved outreach design | Deferred; manual share is enough |
| [09 Polish](09-demo-polish.md) | Privacy proof and failure-state rehearsal | New five-screen UI and actual fly output |
| [10 Stretch](10-stretch.md) | Later expansion ideas | Current P2 list above wins |

## Implementation boundaries and decisions to resolve

- Reuse `TransactionSource`, existing ORM models and feature folders; extend through migrations.
- Decide exact seed amounts and cadence before promising $4.03M annual spend.
- Add staffing/hours and rate comparability data before asserting modeled savings.
- Establish available USAspending/public-rate responses during integration; example counts are not guarantees.
- Select and validate the actual Fly Scout runtime; biological/neuron-count claims require evidence.
- Decide the demo hosting arrangement when two-device access is needed.
- Keep notifications out of scope, and preserve owner approval for publishing or outreach.

## Definition of done

Verified sandbox connection → labeled GovCon spend → REBID → real suppliers/evidence → defensible modeled savings → actual Fly Scout selection → submitted challenge. All prices, source counts and progress states must follow actual data or clearly labeled demo data. No further features until this sequence is reliable.
