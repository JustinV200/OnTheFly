# On the Fly — Current Build Roadmap

Updated 2026-09-13. Follow this order for [the current plan](../plan/plan2.md). [Plan1](../plan/plan1.md) is retained for REBID detail.

Preserve the existing marketplace and task-market implementation. [12](12-task-ownership-and-splitting.md) is the build specification for task ownership and splitting; the other numbered files are reusable component specifications.

## Open questions to answer before building

Don't start P0 until each one has a recorded answer. Write the answer under its question, and carry decisions into [plan2](../plan/plan2.md) and [12](12-task-ownership-and-splitting.md). A proposal is not an answer.

- [x] **1. GovCon seed amounts and cadence.**
  - What exact monthly amounts and variation make up the 3–6 month ledger?
  - Do the totals reproduce the illustrative $4.03M annual spend, or does the displayed figure change?
  - **Answer:** recorded by the implemented ledger (Sohan, merged 2026-09-13; [GOVCON.md](../backend/app/services/transactions/fixture/GOVCON.md)).
    - March–August 2026, with six monthly invoices for each of five services.
    - Variation is −1.5% to +1.5%, with zero average offset.
    - The annualized total is **$4,044,000**, not $4.03M. Use the computed figure everywhere.
- [x] **2. Fixture cost basis rates.**
  - What labor categories and hourly rates does GovCon's current DevSecOps contract bill?
  - What internal loaded costs do Prime A and Sub B carry?
  - These decide whether any Ways to save card qualifies, so set them before seeing results, never by working back from a wanted outcome.
  - **Answer (user, 2026-09-13):** mock numbers for now. Public USAspending supplier data is now wired behind `MARKET_DATA_SOURCE=live`; a public labor-rate source isn't.
    - Fixture rates are labeled demo data, in `backend/app/services/demo/task_chain/fixture_rates.py`.
    - Market rates and suppliers come from a mock market-data source labeled demo data (`MARKET_DATA_SOURCE=mock`).
- [x] **3. USAspending subaward data.**
  - Do award and subaward records for DevSecOps PSC/NAICS codes in Northern Virginia return enough distinct suppliers by UEI to meet the 3-supplier threshold?
  - Answer with a short API check that writes no product code. Record the query, date and counts.
  - **Answer (user, 2026-09-13):** live calls only, with no saved snapshot; each refresh queries the source.
    - `MARKET_DATA_SOURCE=live` queries prime awards and subawards through `services/market_data/usaspending/`.
  - **API check (2026-09-13):** `spending_by_award`, contract types A–D, place of performance VA, 2021-09-13 to 2026-09-13. Counts cover the first 500 rows by amount, so they are floors.

    | Filter | Prime award UEIs | Subaward UEIs |
    |---|---|---|
    | NAICS 541512 + 541519 | 159 | 261 |
    | PSC DA01 | 189 | 242 |
    | PSC D399 | 222 | 223 |

    Both clear the 3-supplier threshold, so subawards are used alongside prime awards.
- [x] **4. Depth cap.**
  - How many levels of splitting does `MAX_TASK_DEPTH` allow?
  - **Answer (user, 2026-09-13):** no depth cap, and no limit on manual splits.
    - The limit is at most 5 active *suggested* pieces per task (`MAX_SUGGESTED_PIECES_PER_TASK=5`).
    - Manual splits never count toward it, so a task can be broken up indefinitely.
- [x] **5. Price display default for `new` tasks and pieces.**
  - Hidden by default (plan2) protects the poster's budget and cut. It leaves market cards showing "Price not disclosed" on a price-first board.
  - Shown by default makes the board consistent, but discloses each piece's cut.
  - **Answer (user, 2026-09-13):** hidden by default.
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
| App foundation | React features, FastAPI routes, SQLAlchemy models, Alembic migrations 0001–0014 | Implemented locally |
| Stripe sandbox ingestion | `transactions/stripe/`, `api/connections/`, frontend connection controls, mocked HTTP tests | Implemented; real sandbox consent unverified |
| Expense pipeline | Fixture source, normalization, recurrence, baseline and expense API; GovCon ledger via `app.cli.seed_govcon_demo` and `test_govcon_seed.py` | Implemented; GovCon totals and privacy covered by tests; on-screen display and labels not yet checked |
| Publishing and profiles | Publish stepper, exact preview, public projections and visibility tests; requirement rows and category templates (cleaning, DevSecOps) | Implemented; the cleaning scope columns remain in place |
| Offers/comparison | Submission/revisions, sealed/open rules, Offers inbox, deterministic math, per-requirement responses and acceptance | Implemented ([12](12-task-ownership-and-splitting.md), steps 2 and 4) |
| Task-market UI | Markets board, market page with bid ticket, bid form, Spend, My listings, Offers, trace, light/dark/system themes ([11](11-usability-and-dark-mode.md)) | Built and merged; keyboard focus and honesty-label audit open |
| Evidence/outreach | Local evidence logic; registry stub; outreach backend (fixture, Tavily or USAspending discovery with UEI identity and award evidence, approval gate, sandbox/allowlisted SMTP queue, opt-out) and Invite suppliers UI | Registry missing; USAspending tested on recorded responses and checked live by hand; Tavily and SMTP unverified live; delivery tracking not built |
| REBID experience | REBID… on a Spend expense opens a private DevSecOps task with requirements and constraints (`features/tasks/new/`); no public-rate pricing or Progress → Market → Bid orchestration | Partial: scope entry only |
| Task ownership and splitting | `models/tasks/`, `services/tasks/`, `services/splitting/`, `services/rates/`, `services/market_data/`, `services/savings/`, tests in `tests/tasks/`, `tests/savings/` and `tests/market_data/`; screens in `features/tasks/`, `split/`, `savings/`, `rates/`, `work/` and the `/demo` guide | Steps 1–10 implemented. The demo runs on the mock market-data source; `live` answers suppliers from USAspending, with labor rates not checked ([12](12-task-ownership-and-splitting.md)) |
| Fly Scout | `flybrain` circuits label their results on Spend and similar listings; no Fly Scout runtime | Not started; after splitting |

Last verified result (2026-09-13, `main` after merging task ownership, the live fly brain and USAspending discovery): **509 backend tests passed; `tsc`, the frontend build, and the colour and contrast checks passed.**
- A live `MARKET_DATA_SOURCE=live` query for PSC DA01 / NAICS 541512 in Virginia returned 100 prime awards and 83 subawards from 99 distinct UEIs.
- That query ran from a script, not through a saved Ways to save refresh.
- The task-chain browser run below predates this merge.

The GovCon → Prime A → Sub B chain was also driven through the real UI in headless Chrome against a scratch database. That run covered:
- REBID from Spend, preview and publish
- Prime A's offer accepted, and ownership moved
- a suggested split, then the piece published
- Sub B's offer accepted
- all three money views reconciling on `/demo`

It used mock market data, so it is not the acceptance run for "Ways to save from real public evidence", and it ran on one device, not three. Existing checklists must not be marked complete merely because routes or files exist.

## P0 — The splitting path

Open questions 1–5 have recorded answers.

**Prerequisites carried from plan1**

- [ ] Verify Stripe sandbox consent with configured keys and confirm imported transactions render.
- [x] Add GovCon Industries and `fixture_govcon_main` through the existing normalized pipeline. Covered by `backend/tests/test_govcon_seed.py`.
- [ ] Seed 3–6 months across five categories; verify rounded display values against exact arithmetic.
  - Seeded (6 months, 5 categories), and the $4,044,000 annualized total is asserted in minor units.
  - Rounded values on screen are not yet checked.
- [ ] Label synthetic GovCon data separately from Stripe sandbox data.
  - Transactions are `fixture`, and Data sources has a Hackathon demo ledger row.
  - Not yet checked on screen for GovCon alongside a Stripe sandbox connection.
- [ ] Add REBID action and persisted/recoverable progress for one DevSecOps expense.
  - The REBID… action creates a private task whose scope and state persist.
  - The Progress → Market → Bid orchestration isn't built.
- [x] Draft/confirm scope as tagged requirements with hours, location, clearance and classification ([12](12-task-ownership-and-splitting.md), step 2). Owner-entered, with a labeled demo fill; LLM drafting is P1.
- [x] Connect USAspending awards and subawards behind the shared market-data interface. Preserve award identifiers and source evidence ([12](12-task-ownership-and-splitting.md), step 8). `UsaSpendingMarketDataSource` (`MARKET_DATA_SOURCE=live`) and outreach discovery share one client, tested against recorded responses.
- [ ] Apply deterministic qualification, deduplicating suppliers by UEI.
  - UEI dedupe is implemented: supplier counts, the discovery shortlist, candidate storage and reruns all match on UEI alone.
  - Qualification rules beyond the supplier-count threshold aren't built.
- [ ] Integrate one usable public labor-rate path, saving the labor-category mapping and percentiles.
- [ ] Display the deterministic modeled annual cost for the whole expense with the model/quote distinction.

**Task ownership and splitting ([12](12-task-ownership-and-splitting.md))**

- [x] Tasks with poster and task owner; backfill existing listings (step 1). Migration `0013_task_ownership`; no depth cap (question 4).
- [x] Requirements, category templates and per-requirement offer responses (step 2).
- [x] `new` tasks with the price display toggle, hidden by default (step 3).
- [x] Accepting an offer and transferring ownership (step 4).
- [x] Cuts, remainder and undo (step 5).
- [x] Manual split, piece projection, Subcontract label, payer chain and direct-counterparty visibility (step 6). Requirements are picked by hand; the LLM-proposed requirement mapping is P1.
- [x] Cost basis rates, with labeled fixture rates for GovCon, Prime A and Sub B (step 7).
- [ ] Market evidence records (step 8).
  - The `MarketDataSource` interface, UEI dedupe, integer percentiles and `market_evidence` rows are implemented and tested against the mock source.
  - The live source answers suppliers from USAspending prime awards and subawards. No public labor-rate client exists, so live rates are recorded `unavailable`.
  - No live retrieval for the demo segment has been saved yet.
- [ ] Ways to save cards with thresholds from config (step 9).
  - Cards, tiers, config thresholds, the 5-suggested-pieces limit, dismiss/restore and oversight are implemented.
  - The demo cards come from mock data ("Modeled cut from demo market data — not an offer"), not saved live evidence.
- [x] Money views and My work (step 10).

**Gate:** rebid → accept → ownership transfers → Ways to save from real public evidence → piece split off and published → piece's offer accepted → the new owner can split → every money view reconciles.

## P1 — Complete the planned demo

- [ ] Split everything, LLM-drafted and code-validated ([12](12-task-ownership-and-splitting.md), step 11).
- [ ] LLM scope drafting for `new` tasks from owner-provided detail only.
- [ ] Enrich shortlisted suppliers through Tavily and source-backed LLM summaries.
  - Tavily enrichment of the USAspending discovery shortlist is built and mock-tested; each page is marked as a name search.
  - LLM summaries aren't built.
- [ ] Fly Scout on qualified suppliers for a published piece, and FlyHash ordering of retrieved awards. Label each at the result ([12](12-task-ownership-and-splitting.md), step 12).
- [x] Build My work, the split drawer and Ways to save on the task-market system ([11](11-usability-and-dark-mode.md)). Built with the P0 steps, plus a `/demo` guide that stages the chain.
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

- Reuse `TransactionSource`, existing ORM models and feature folders; extend through migrations numbered from 0015.
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
