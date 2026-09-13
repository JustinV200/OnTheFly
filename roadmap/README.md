# On the Fly — Current Build Roadmap

Updated 2026-09-13. Follow this order for [the current plan](../plan/plan2.md). [Plan1](../plan/plan1.md) is retained for REBID detail.

Preserve the existing marketplace and task-market implementation. [12](12-task-ownership-and-splitting.md) is the build specification for task ownership and splitting; the other numbered files are reusable component specifications.

## Open questions to answer before building

Don't start P0 until each one has a recorded answer. Write the answer under its question, and carry decisions into [plan2](../plan/plan2.md) and [12](12-task-ownership-and-splitting.md). A proposal is not an answer.

- [ ] **1. GovCon seed amounts and cadence.**
  - What exact monthly amounts and variation make up the 3–6 month ledger?
  - Do the totals reproduce the illustrative $4.03M annual spend, or does the displayed figure change?
  - Proposal: none yet. Plan1's monthly examples don't multiply exactly to its annual figures.
  - Blocks: GovCon fixtures and every downstream figure.
- [ ] **2. Fixture cost basis rates.**
  - What labor categories and hourly rates does GovCon's current DevSecOps contract bill?
  - What internal loaded costs do Prime A and Sub B carry?
  - These decide whether any Ways to save card qualifies, so set them before seeing results, never by working back from a wanted outcome.
  - Proposal: none yet.
  - Blocks: [12](12-task-ownership-and-splitting.md) steps 7 and 9, and the demo.
- [ ] **3. USAspending subaward data.**
  - Do award and subaward records for DevSecOps PSC/NAICS codes in Northern Virginia return enough distinct suppliers by UEI to meet the 3-supplier threshold?
  - Answer with a short API check that writes no product code. Record the query, date and counts.
  - Proposal: prime awards alone, if subawards are too thin.
  - Blocks: [12](12-task-ownership-and-splitting.md) steps 8 and 9.
- [ ] **4. Depth cap.**
  - How many levels of splitting does `MAX_TASK_DEPTH` allow?
  - Proposal: 5. The demo uses 2.
  - Blocks: [12](12-task-ownership-and-splitting.md) step 1.
- [ ] **5. Price display default for `new` tasks and pieces.**
  - Hidden by default (plan2) protects the poster's budget and cut. It leaves market cards showing "Price not disclosed" on a price-first board.
  - Shown by default makes the board consistent, but discloses each piece's cut.
  - Proposal: hidden.
  - Blocks: [12](12-task-ownership-and-splitting.md) steps 3 and 6.
- [ ] **6. Fly Scout runtime.**
  - Which implementation runs Fly Scout, what does it take as input, and what run record does it produce?
  - Proposal: none yet. No neuron-count or connectome claim without runtime evidence.
  - Blocks: [12](12-task-ownership-and-splitting.md) step 12 only (P1). P0 can start without this answer.
- [ ] **7. Three-device demo hosting.**
  - How do GovCon, Prime A and Sub B reach one running app from three devices: deployed URLs, a tunnel, or a shared local network?
  - Proposal: none yet.
  - Blocks: the P1 rehearsal. P0 can start without this answer.

## Where we are

| Capability | Evidence in repository | Status |
|---|---|---|
| App foundation | React features, FastAPI routes, SQLAlchemy models, Alembic migrations 0001–0012 | Implemented locally |
| Stripe sandbox ingestion | `transactions/stripe/`, `api/connections/`, frontend connection controls, mocked HTTP tests | Implemented; real sandbox consent unverified |
| Expense pipeline | Fixture source, normalization, recurrence, baseline and expense API | Implemented for existing data; GovCon validation pending |
| Publishing and profiles | Publish stepper, exact preview, public projections and visibility tests | Reuse; scope moves onto requirements and category templates ([12](12-task-ownership-and-splitting.md), step 2) |
| Offers/comparison | Submission/revisions, sealed/open rules, Offers inbox and deterministic math | Reuse; per-requirement responses and acceptance pending ([12](12-task-ownership-and-splitting.md), steps 2 and 4) |
| Task-market UI | Markets board, market page with bid ticket, bid form, Spend, My listings, Offers, trace, light/dark/system themes ([11](11-usability-and-dark-mode.md)) | Built and merged; keyboard focus and honesty-label audit open |
| Evidence/outreach | Local evidence logic; registry stub; outreach backend (fixture/Tavily discovery, approval gate, sandbox/allowlisted SMTP queue, opt-out) and Invite suppliers UI | Registry missing; Tavily and SMTP unverified live; delivery tracking not built |
| REBID experience | No GovCon/REBID/USAspending/public-rate implementation found | Not started |
| Task ownership and splitting | No task, acceptance, requirement, split, cost basis, market evidence, Ways to save or money view implementation found | Not started ([12](12-task-ownership-and-splitting.md)) |
| Fly Scout | `flybrain` circuits label their results on Spend and similar listings; no Fly Scout runtime | Not started; after splitting |

Last reported result (at the 2026-09-13 merge): **360 backend tests passed; frontend build passed with the colour and contrast checks.** This is not an end-to-end acceptance run for the current plan. Existing checklists must not be marked complete merely because routes or files exist.

## P0 — The splitting path

Start once open questions 1–5 have recorded answers.

**Prerequisites carried from plan1**

- [ ] Verify Stripe sandbox consent with configured keys and confirm imported transactions render.
- [ ] Add GovCon Industries and `fixture_govcon_main` through the existing normalized pipeline.
- [ ] Seed 3–6 months across five categories; verify rounded display values against exact arithmetic.
- [ ] Label synthetic GovCon data separately from Stripe sandbox data.
- [ ] Add REBID action and persisted/recoverable progress for one DevSecOps expense.
- [ ] Draft/confirm scope as tagged requirements with hours, location, clearance and classification ([12](12-task-ownership-and-splitting.md), step 2).
- [ ] Connect USAspending awards and subawards behind the shared market-data interface. Preserve award identifiers and source evidence ([12](12-task-ownership-and-splitting.md), step 8).
- [ ] Apply deterministic qualification, deduplicating suppliers by UEI.
- [ ] Integrate one usable public labor-rate path, saving the labor-category mapping and percentiles.
- [ ] Display the deterministic modeled annual cost for the whole expense with the model/quote distinction.

**Task ownership and splitting ([12](12-task-ownership-and-splitting.md))**

- [ ] Tasks with poster and task owner; backfill existing listings (step 1).
- [ ] Requirements, category templates and per-requirement offer responses (step 2).
- [ ] `new` tasks with the price display toggle (step 3).
- [ ] Accepting an offer and transferring ownership (step 4).
- [ ] Cuts, remainder and undo (step 5).
- [ ] Manual split, piece projection, Subcontract label, payer chain and direct-counterparty visibility (step 6).
- [ ] Cost basis rates, with labeled fixture rates for GovCon, Prime A and Sub B (step 7).
- [ ] Market evidence records (step 8).
- [ ] Ways to save cards with thresholds from config (step 9).
- [ ] Money views and My work (step 10).

**Gate:** rebid → accept → ownership transfers → Ways to save from real public evidence → piece split off and published → piece's offer accepted → the new owner can split → every money view reconciles.

## P1 — Complete the planned demo

- [ ] Split everything, LLM-drafted and code-validated ([12](12-task-ownership-and-splitting.md), step 11).
- [ ] LLM scope drafting for `new` tasks from owner-provided detail only.
- [ ] Enrich shortlisted suppliers through Tavily and source-backed LLM summaries.
- [ ] Fly Scout on qualified suppliers for a published piece, and FlyHash ordering of retrieved awards. Label each at the result ([12](12-task-ownership-and-splitting.md), step 12).
- [ ] Build My work, the split drawer and Ways to save on the task-market system ([11](11-usability-and-dark-mode.md)).
- [ ] Finish roadmap 11's keyboard-focus and screen-by-screen honesty-label audit, including the new screens.
- [ ] Distinguish a teammate demo offer from a genuine supplier quote.
- [ ] Rehearse three accounts on three devices in fresh browsers, exercise API failure states, and record a backup.

A genuine external quote is optional. Notifications are not required. Owner-approved supplier invitations exist (sandbox outbox by default); manual sharing of the listing is still sufficient for the demo.

## P2 — Only after P0/P1 are stable

- Splitting before bidding (teaming, with offers contingent on award)
- Period conversion between a task and its pieces
- Tool-selecting agent orchestration and fly learning/rewards
- SAM.gov if needed beyond USAspending, broader categories/pricing, more banks
- Production auth and deployment expansion

A fixed orchestration sequence remains sufficient for P0.

## Phase documents: reuse map

| File | Reuse now | Change under the current plan |
|---|---|---|
| [00 Foundations](00-foundations.md) | App, money/provenance, accounts, migrations | Do not restart scaffolding; hosting is not the first gate |
| [01 Real counteroffer](01-real-counteroffer-path.md) | Evidence/provenance guidance for genuine quotes | Optional bonus, no longer critical path |
| [02 Ingestion](02-financial-ingestion.md) | Stripe and fixture pipeline | Verify Stripe; add GovCon fixtures; no custom Stripe ledger dependency |
| [03 Dashboard](03-expense-dashboard.md) | Grouping/recurrence/annualization | GovCon spend and REBID entry |
| [04 Visibility/profiles](04-visibility-and-profiles.md) | Private defaults, exact preview, scope versions | Requirements and templates replace cleaning scope fields; pieces get their own projection (12) |
| [05 Marketplace/challenges](05-marketplace-and-challenges.md) | Browse, submit, revise, sealed/open controls | Acceptance, ownership transfer and payer chain (12) |
| [06 Comparison](06-counteroffer-comparison.md) | Deterministic normalization and scope differences | Scope completeness from per-requirement responses; money views reuse the arithmetic (12) |
| [07 Evidence](07-challenger-evidence.md) | Source/status conventions | USAspending and public rates as market evidence P0 (12); Tavily P1; no blanket verification |
| [08 Invitations](08-outbound-invitations.md) | Approved outreach with a sandbox-outbox default: backend and Invite suppliers UI | Secondary; pieces use the same approval flow; manual share is still enough |
| [09 Polish](09-demo-polish.md) | Privacy proof and failure-state rehearsal | Three-account demo from plan2; fly output after splitting; visual system in 11 |
| [10 Stretch](10-stretch.md) | Later expansion ideas | Current P2 list above wins |
| [11 Usability and dark mode](11-usability-and-dark-mode.md) | Task-market (Kalshi-style) direction, design principles, per-screen redesign, theme tokens | Task-market screens and themes built; accessibility and honesty-label audit open; new screens for 12 in P1 |
| [12 Task ownership and splitting](12-task-ownership-and-splitting.md) | Build steps and acceptance checks for tasks, acceptance, cuts, splits, Ways to save, money views, fly after splitting | New; steps 1–10 are P0, 11–12 are P1 |

## Implementation boundaries

Open decisions are listed at the top of this file.

- Reuse `TransactionSource`, existing ORM models and feature folders; extend through migrations numbered from 0013.
- Keep the cleaning scope columns until the category template migration passes the existing listing, offer and comparison tests.
- Supplier counts from USAspending are floors, and example counts are not guarantees.
- Biological or neuron-count claims about Fly Scout require runtime evidence.
- Keep notifications out of scope. Preserve owner approval for publishing, splitting, acceptance and outreach.

## Definition of done

1. Verified sandbox connection
2. Labeled GovCon spend
3. REBID with confirmed requirements
4. Accepted offer transfers ownership
5. Ways to save from real public evidence
6. Piece split off, published and accepted
7. The new owner can split
8. Reconciled money views
9. Fly Scout selection, after splitting

All prices, source counts and progress states must follow actual data or clearly labeled demo data. No further features until this sequence is reliable.
