# On the Fly — Current Hackathon Plan

**Connect existing business spend → REBID → discover suppliers → compare modeled pricing → receive a challenge.**

> Superseded as the plan of record on 2026-09-13 by [plan2](plan2.md). Plan2 adds task ownership, offer acceptance, splitting and Ways to save, and moves Fly Scout after splitting.
>
> This document is retained for REBID detail: the GovCon ledger, the two data paths, scope inputs, supplier discovery and public-rate rules. Where the two differ on priority, demo sequence or UI, plan2 wins.

Updated 2026-09-12 using the supplied `on_the_fly_hackathon_build_plan.md`. It superseded the [previous marketplace plan](previous-marketplace-plan.md) for product priorities while retaining the implemented marketplace, data pipeline, and privacy mechanics.

## Current position

The React/Vite frontend and FastAPI/SQLAlchemy backend exist. SQLite is the current local database. Stripe sandbox consent, ownership binding, paginated ingestion, transaction updates, bounded refresh polling, and dashboard controls are implemented. Fixtures and the existing cleaning publish/challenge/comparison flow are reusable.

The last implementation verification (2026-09-12) reported 313 backend tests and a successful frontend build. Stripe tests mocked the provider. Actual Stripe sandbox consent remains unverified. GovCon fixtures, REBID, USAspending, public labor rates, OpenAI processing, Tavily enrichment, and Fly Scout are not implemented.

The detailed current order and acceptance gates live in [the roadmap](../roadmap/README.md). The old numbered phases are component references, not an instruction to restart the build.

## Product and demo buyer

The product action is **REBID**. Start with fictional **GovCon Industries** and complete one end-to-end **DevSecOps Engineering Support** example in Northern Virginia. Other categories support the spend view; they do not need full supplier/pricing workflows.

| Planned expense | Illustrative annual baseline |
|---|---:|
| DevSecOps Engineering Support | $1,420,000 |
| Cybersecurity Support | $980,000 |
| Program Management | $740,000 |
| Facilities Services | $510,000 |
| Logistics Support | $380,000 |
| Total | $4,030,000 |

Create `fixture_govcon_main` with 3–6 months of realistic recurring payments. Derive displayed totals from integer-minor-unit data, not these rounded examples. Resolve monthly amounts and variation before seeding; approximate monthly numbers in the supplied plan do not all multiply exactly to the illustrative annual values.

The existing Apex/cleaning fixtures and tests remain useful regression coverage. Adding GovCon must not require rewriting the entire marketplace.

## Two data paths, one pipeline

1. Stripe Financial Connections sandbox proves the account-linking and import flow, returning simulated Stripe transactions labeled `sandbox`.
2. A synthetic GovCon ledger enters through the existing `FixtureSource` and `NormalizedTransaction` pipeline, labeled `fixture`.

Display the fixture label as **Hackathon demo ledger — synthetic buyer spend based on public procurement categories**. Never attribute those custom payments to Stripe or present them as private government-contractor transactions.

Production bank data, Rho, Mercury, payments, balances, webhooks, and scheduled refreshes are outside the minimal implemented Stripe slice. The company switcher is demo identity, not authentication.

## P0: complete REBID through modeled savings

### 1. Stripe and GovCon spend

Verify the real Stripe sandbox popup and completed import using keys from one sandbox. Keep the already-built transaction-only permissions and bounded polling. Load GovCon fixtures through the existing import service; verify recurrence, annualization, ownership, and source labels.

### 2. REBID and contract scope

Add one entry point associated with the selected expense and one visible progress view. A fixed sequence is sufficient initially; autonomous tool selection is P2.

The workflow drafts structured service, location, clearance, labor-category, NAICS, and PSC fields from supplied contract details. OpenAI is the new planned reasoning provider; current Anthropic configuration is not evidence of a working integration.

Bank descriptions do not establish contract scope. The owner confirms material fields. Labor categories alone cannot justify an annual estimate: staffing/hours, period, seniority, location, and included costs must also be supplied or explicitly marked unknown.

REBID begins private research. Publishing the listing still requires the existing exact-payload preview and owner confirmation.

### 3. Real supplier discovery

Implement USAspending discovery first. Preserve award IDs, source URLs, retrieval times, relevant classifications, agency, locations, and vendor identifiers where available. Deduplicate companies and qualify candidates deterministically.

Counts such as “43 awards / 12 suppliers / 5 qualified” in the supplied plan are script examples, not current results. Populate progress and counts from actual completed work. SAM.gov is optional.

### 4. Public pricing model

Use GSA CALC+ or another documented public labor-rate source where usable. Save the rate source, dates, labor mapping, hours, and assumptions. Compute costs and savings deterministically in integer minor units.

Show **Modeled bid from public pricing — not a vendor quote**. Published rates are inputs with limitations, not guaranteed executable offers. If usable rates or scope are missing, show unavailable/provisional results rather than inventing prices.

Keep modeled prices separate from the existing submitted `Challenge` records. Reuse comparison arithmetic where appropriate, but add the necessary DevSecOps comparability fields.

P0 gate: **spend → REBID → real suppliers and evidence → defensible modeled savings**.

## P1: supplier enrichment, Fly Scout, and challenge payoff

### Tavily and evidence

Use Tavily after structured supplier discovery to find capability pages, locations, certifications, and case studies. An LLM may normalize and summarize cited material. Unknown/unavailable checks stay explicit; a lack of adverse results is not verification.

### Fly Scout

Fly Scout is now in scope as a P1 exploration step over an already-qualified supplier set. It chooses a supplier for further investigation; it does not compute money, establish identity, qualify suppliers, or declare the objectively best offer.

The selected supplier must come from actual execution output. Record the candidate-to-input mapping, run parameters, output, and chosen supplier. Do not display a biological-connectome or neuron-count claim until the selected model and runtime support it; the source plan's 165,000-neuron claim is an unverified target.

The implementation/runtime is still to be chosen. If it does not work, report that limitation; animation alone does not fulfill the phase. Fly learning and reward updates are P2.

### Challenge payoff

Reuse the listing/challenge form, sealed/open bidding semantics, revisions, and comparison view. Adapt the scope to DevSecOps and let a second browser/device submit an offer. Poll or refresh the buyer view; notifications remain excluded.

An offer submitted by a teammate during a demo is still a demo offer. A genuine willing supplier quote is optional and must retain evidence of its origin. “Live” means submitted during the session, not necessarily commercially binding.

Use a shareable listing for manual invitation. Sending outreach is not authorized by a roadmap edit.

## UI and demo sequence

Retain the modern Robinhood/Supabase-inspired direction: readable money, restrained green accents, clear status, accessible controls, and responsive layouts. Build on existing React features.

1. **Spend:** GovCon ledger, provenance, annualized expenses, dominant REBID action.
2. **Progress:** actual completed/running/failed stages with recovery.
3. **Market:** sourced suppliers, comparable public-rate models, assumptions.
4. **Fly:** actual candidate exploration output and selected supplier.
5. **Bid:** newly submitted challenge, scope comparison, potential savings.

Use illustrative $1.42M incumbent / $1.16M offer only when supported by the seeded and submitted values. Their $260k difference is about 18.3%; compute it from stored amounts. A genuine quote is a bonus, not a gate.

## Reuse and invariants

Keep the current module layout, migrations, adapters, demo accounts, and marketplace routes. Extend scope and evidence models with migrations as needed.

- Expenses import private; raw bank data never becomes a public listing.
- Public projection is constructed explicitly, and publishing requires owner preview/confirmation.
- Offers are sealed by default; opening a listing does not retroactively expose sealed offers.
- Challenger identities remain private to the owner.
- Money, eligibility, identity matching, visibility, deadlines, and objective ranking are deterministic.
- Synthetic spend, public evidence, modeled prices, and submitted offers stay distinguishable.
- Savings remain potential until a switch happens.

## P2 and cuts

Defer autonomous orchestration, fly learning, additional end-to-end categories, automated outreach, real authentication, payments, and production deployment complexity. Supabase/Postgres is a later hosting decision; local SQLite is implemented now.

A simple REBID workflow is P0 even though a tool-selecting agent is P2. Fly Scout is P1 and required for the full planned demo, even though a P0 milestone can run without it.

## Demo-ready gate

The current project is not yet demo-ready for this story. Completion requires verified Stripe sandbox behavior, the GovCon ledger, one full REBID path with actual suppliers and cited pricing, real Fly Scout output, a two-device challenge, honest provenance, and a fresh-browser rehearsal plus backup recording.
