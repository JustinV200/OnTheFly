# Phase 12 — Task ownership and splitting

> Status — 2026-09-13: Steps 1–10 are implemented and merged. Steps 11–12 (P1) aren't started.
>
> - **Steps 8–9** default to a mock market-data source labeled demo data.
>   - `MARKET_DATA_SOURCE=live` answers suppliers from USAspending prime awards and subawards (`services/market_data/usaspending/`, one module per search rather than the file names below).
>   - No public labor-rate client exists, so live rates are `unavailable` and live cards stay not viable.
> - **Decisions recorded in the [roadmap](README.md) open questions:**
>   - fixture rates and mock market data for now
>   - live calls only, with no snapshot
>   - no depth cap, with at most 5 active suggested pieces per task and unlimited manual splits
>   - prices hidden by default for `new` tasks and pieces
> - **Not built:** the LLM-proposed requirement mapping in the split drawer and LLM hour drafting (both P1).
>
> Steps 1–10 are P0 and steps 11–12 are P1 on the [current roadmap](README.md).
>
> Product reasoning is in [plan2](../plan/plan2.md), and the rules are in CLAUDE.md under "Task ownership and splitting". This file is the build order and acceptance checks.

**Goal:** any task owner can split off pieces of a task, and each piece is priced as a cut of the owner's starting price. Where public contract history shows splitting is cheaper, the product suggests exactly those pieces. Accepting an offer moves ownership to the bidder, who can split again. Every money view reconciles.

**Depends on:** [04](04-visibility-and-profiles.md) and [05](05-marketplace-and-challenges.md) as built. Plan1 P0 provides GovCon fixtures, USAspending discovery and one public labor-rate path. [11](11-usability-and-dark-mode.md)'s primitives and market card are used for screens. **Size:** XL. **Critical path:** yes, once plan2 is adopted.

## Builds on merged work

| Merged work | What exists | How this phase uses it |
|---|---|---|
| Task-market UI ([11](11-usability-and-dark-mode.md)) | `frontend/src/shared/ui` primitives (`Drawer`, `Tabs`, `Disclosure` and more), `shared/market/MarketCard`, `shared/flybrain/FlyBrainBadge`, navigation in `frontend/src/app/shell/topbar/NavBar.tsx` | New screens go in new feature folders and use these primitives. Keep the public listing fields the board reads; add, don't rename. Use its words: Bid, offer, Offers, Markets · Spend · My listings. |
| Outreach ([08](08-outbound-invitations.md)) | Migration `0012_outreach`, discovery source interface, approval-gated invitations | Migrations start at 0015. Inviting suppliers to a piece uses the same approval flow; there is no second outreach path. |
| Plan1 REBID work (not started) | — | Build the USAspending and labor-rate clients once, behind a market-data interface that both REBID discovery and step 8 call. |

**Keep schema changes additive** (new tables, and nullable columns on `scope_versions`, `public_listings` and `challenges`) until the category template migration passes the existing listing, offer and comparison tests. Do not drop or rename the cleaning scope columns before then; the cleaning template reads them in place.

## Steps

### 1. Tasks, posters and task owners

`backend/app/models/task.py`, `backend/app/services/tasks/`.

- **`tasks` table:**
  - `origin` (`rebid | new | split`), nullable `expense_id`, `parent_task_id`
  - `posted_by_account_id`, `owner_account_id`, `depth`
  - `state`, nullable `accepted_challenge_id` and `accepted_scope_version_id`
  - `currency`, `billing_period`, timestamps
- **Links:** add a nullable `task_id` to `scope_versions` and `public_listings`. Backfill each existing listing as a `rebid` task whose poster and task owner are the listing's current `owner_account_id`.
- **Poster vs. task owner:** `public_listings.owner_account_id` keeps its meaning (the poster). Comment both columns so nobody reads "owner" as the task owner.
- **Depth:** no cap (open question 4). `depth` is recorded. The only limit is `MAX_SUGGESTED_PIECES_PER_TASK` (5 active suggested pieces per task, read once in config); manual splits never count toward it.

**Done when:** existing listing, offer and comparison tests pass unchanged against backfilled tasks. Every listing resolves to exactly one task.

### 2. Requirements and category templates

`backend/app/models/requirement.py`, `backend/app/services/scope/templates/`.

- **`requirements` table:** one row per requirement on a scope version.
  - Identity: `requirement_key` (stable across versions), `text`, `priority` (`must | should`)
  - Tags: `labor_category`, `psc`, `naics`, `tags_status` (`draft | confirmed`)
  - Hours: `hours_estimate`, `hours_status`
  - `source` (`owner | llm-draft | flowed-down`)
- **`scope_constraints` table:** `kind` (clearance, location, insurance, set-aside), value, and `inherited_from_task_id`.
- **Category templates:** code-defined Pydantic schemas with one file per category. Cleaning maps onto the existing columns; DevSecOps uses a new nullable `category_fields` JSON column, validated at the API boundary.
- **Per-requirement offer responses:** `challenge_requirement_responses` holds, per offer and per revision, the requirement key, included or excluded, and a note. The existing free-text scope fields remain for conditions.
- **Scope completeness** in the comparison and leaderboard uses these responses where present, and falls back to the existing computation.

**Done when:** a DevSecOps scope saves with tagged requirements and constraints. An offer records a response for every requirement. A revision keeps its own responses. Editing the scope creates a new version and never changes an earlier offer's responses.

### 3. New tasks

`backend/app/api/tasks/`, `frontend/src/features/tasks/new/`.

- **Create:** a `new` task with no expense, scope written by the owner, and an optional budget.
- **Price display:** a toggle, off by default for `new` and `split` tasks. The public projection gains a nullable price. The market card shows "Price not disclosed" when it's absent, without changing how the card reads a present price.
- **Seed:** one demo `new` task.

**Done when:** a new task goes private → scope confirmed → public through the existing exact preview. With the toggle off, its public payload contains no price field.

### 4. Accepting an offer

`backend/app/services/tasks/acceptance.py`.

- **Who and what:** the poster accepts one active offer. That closes bidding and sets `accepted_challenge_id` and `accepted_scope_version_id` to the version that offer answered. `owner_account_id` becomes the bidder, and the change is audited with who, when, and the prior and new owner.
- **Late bids** are rejected with a clear message.
- **Blocked when:**
  - the offer's scope version includes requirements now assigned to an active piece
  - accepting a piece's offer would make the task owner's remainder negative
- **Offers above the listed price** need an explicit confirmation.

**Done when:** after acceptance, only the new task owner can call split endpoints for that task, and the previous owner gets a clear refusal. Acceptance, rejection of late bids, and both blocks have service-level tests.

### 5. Cuts and remainder

`backend/app/models/task_split.py`, `backend/app/services/splitting/ledger.py`.

- **`task_splits` table:**
  - `parent_task_id`, `child_task_id`, `split_by_account_id`
  - `split_before_acceptance`, `entry_point` (`suggested | manual | split_everything`)
  - `cut_minor`, `currency`, nullable `savings_card_id`, `created_at`, `undone_at`
- **`requirement_assignments` table:** split and requirement key.
- **Ledger rules:**
  - **Starting price:** the listed price before acceptance, or the accepted offer after.
  - **Remainder** = starting price − Σ(accepted price of each active piece split by this owner, or its cut if not yet accepted).
  - **Validation:** a positive cut, the same currency and period, and total cuts ≤ starting price.
- **Buyer before acceptance:** a split writes a new parent scope version without the assigned requirements, at listed price − cut.
- **Undo** is allowed only while the piece has no accepted offer and, for a buyer's split, while the parent has no accepted offer. It restores requirements and cut, closes the piece's listing, and retains its offers.

**Done when:** ledger tests cover split, a piece accepted below its cut, undo, total cuts equal to the starting price, a cut that would exceed it, currency and period mismatch, and a buyer's parent accepted after a split. Each case asserts exact integer results.

### 6. Manual split and piece visibility

`backend/app/services/splitting/`, `backend/app/services/listings/` (piece projection), `frontend/src/features/split/`.

- **Split drawer:** the owner picks requirements, or describes a piece and confirms an LLM-proposed requirement mapping, then sets a cut. The drawer shows remainder live and inherited constraints on by default. Removing a constraint is audited and warned.
- **Piece projection** is built field by field in its own model, never derived from the parent's. The parent ID, parent poster, accepted price, rates, remainder and savings cards aren't fields on it at all.
- **Subcontract label** on pieces split from an accepted task.
- **Payer chain** in `backend/app/services/tasks/payer_chain.py`: the piece's poster, plus the parent's payer chain when the poster owns the parent through an accepted offer. Bid submission rejects any account in the chain.
- **Direct counterparties only:** offers and identity reads are checked against poster and task owner. A client's endpoints never return pieces its task owner split off.
- **Parent scope changes** flag affected pieces "parent scope changed, review" without rewriting them.

**Done when:**
- A no-leak test serializes a published piece and asserts the buyer's name, parent task ID and accepted price are absent. It also asserts a field added to the parent model does not appear in the piece projection.
- Payer-chain tests cover three levels, including a bidder who wins a buyer's parent task and so is not in the chain for pieces the buyer split off earlier.
- The buyer's API calls return nothing about Sub B.

### 7. Cost basis rates

`backend/app/models/cost_basis_rate.py`, `frontend/src/features/rates/`.

- **`cost_basis_rates` table:**
  - `account_id`, nullable `task_id`, `kind` (`internal_cost | current_contract_rate`)
  - `labor_category`, `rate_minor_per_hour`, `currency`, `effective_date`
  - `provenance` (`owner-entered | fixture`)
- **Private:** rates never appear in any public projection or in another account's response.
- **Fixture rates** for GovCon (contract rates on its DevSecOps task) and for Prime A and Sub B (internal cost), labeled as demo data.

**Done when:** a projection test confirms rates never serialize publicly. Keep cost for a segment is exact integer math from hours × rate.

### 8. Market evidence

`backend/app/services/market_data/` (interface, `usaspending_awards.py`, `usaspending_subawards.py`, `public_labor_rates.py`), `backend/app/models/market_evidence.py`.

- **Shared clients:** one interface shared with plan1 REBID discovery; external calls live only here.
- **Query inputs:** the segment's PSC/NAICS, place of performance and a 5-year lookback. Confirm the subaward endpoint and filter support during integration.
- **Supplier count:** distinct suppliers deduped by UEI only. Records without a UEI are listed but not counted.
- **Rates:** matching public labor rates, keeping the median and interquartile range. The labor-category mapping is saved, not re-derived.
- **`market_evidence` table:**
  - `source`, `query`, `retrieved_at`, `status` (`ok | no_match | unavailable`)
  - award IDs, UEIs, amounts in minor units, URLs, `limitations`
- An unavailable source is recorded as `unavailable` and rendered "not checked".

**Done when:** recorded API responses (not live calls) test the parsing, UEI dedupe, the no-match and unavailable states, and rate percentiles in integer minor units. One live retrieval for the demo segment is saved with its timestamp.

### 9. Ways to save

`backend/app/services/savings/` (`segments.py`, `costs.py`, `viability.py`, `cards.py`), `backend/app/models/savings_card.py`, `frontend/src/features/savings/`.

- **Segments:** confirmed requirements still with the task, grouped by confirmed labor category and PSC/NAICS.
- **Per segment:**
  - keep cost from cost basis rates
  - suggested cut from the median public rate × the same hours
  - oversight from an owner-entered amount; unset makes the card provisional
  - modeled savings, with the percentage in basis points
- **Thresholds** in config: `SAVINGS_MIN_BASIS_POINTS=1000`, `SAVINGS_MIN_ANNUAL_MINOR=2500000`, `SAVINGS_MIN_SUPPLIERS=3`, `SAVINGS_LOOKBACK_YEARS=5`.
- **Tiers:**
  - `potential_savings`: all conditions in plan2 hold
  - `specialist_market`: enough suppliers, no computable or positive savings
  - `needs_rates`: no cost basis rates
  - `not_viable`
  - Only `potential_savings` appears in the suggestion list.
- **`savings_cards` table:**
  - inputs: segment requirement keys, hours and status, each cost with its basis
  - evidence IDs, thresholds used, tier
  - `status` (`suggested | dismissed | split | stale`), `computed_at`
  - A new scope version or new rates mark cards `stale`; a dismissal holds for that scope version.
- **Screen:** on a task the acting account owns, **Ways to save** lists suggestion cards. Each card has **Split off** (which opens step 6's drawer prefilled with the requirements and suggested cut) and **Dismiss**. The disclosure shows sources, award links, not-checked sources and thresholds. Specialist-market cards sit in their own section.

**Done when:**
- Viability tests cover each threshold at, just below, and just above its value.
- A segment without rates never reaches the suggestion list.
- Cards reproduce identical integer results from stored inputs.
- The demo run's cards come from saved live evidence, and their thresholds match config.

### 10. Money views

`backend/app/services/tasks/money_view.py`, `frontend/src/features/work/`.

- **My work:** tasks the acting account owns through an accepted offer, with starting price, pieces, remainder and, where rates exist, keep cost and potential margin. Add **My work** to `NavBar.tsx` after My listings, shown only for an acting business, never a public visitor.
- **Buyer's task:** baseline, accepted and pending amounts for the parent and the buyer's own pieces, and potential savings. Nothing beyond its direct counterparties.
- All amounts share one currency and period. The word "potential" stays on savings and margin.

**Done when:** a three-account test (GovCon → Prime A → Sub B) reconciles every view to the cent. Each account's response contains no figures from two steps away.

### 11. Split everything (P1)

`backend/app/services/splitting/split_everything/`, with the LLM client behind its own module.

- **Input:** the confirmed scope version and the owner's notes.
- **Output:** a schema-validated proposal of pieces with requirement keys, dependencies, deliverables, acceptance criteria and open questions.
- **Checks:**
  - every requirement key exists and is assigned at most once (unassigned stays with the task)
  - no dependency cycles
  - constraints inherit
- **`split_plans` table:** entry point, input scope version, model, prompt version, raw output and status.
- Each proposed piece becomes a candidate segment for step 9's cards. Nothing publishes or sets a cut without the owner.

**Done when:** invalid model output (unknown key, duplicate assignment, cycle) is rejected with a visible reason and never partially applied.

### 12. Fly after splitting (P1, after step 11)

- **Fly Scout** runs on qualified suppliers for a published piece, with plan1's limits and run record.
- **FlyHash** can order a card's retrieved award list by description similarity. Counts, qualification and savings never depend on it.
- **Labeling:** every result a fly component touched carries `FlyBrainBadge` at the result itself.
  - Plain-language role, e.g. "Ordered by Fly similarity" or "Fly Scout picked this supplier to research next".
  - A disclosure with component, inputs and run record.
  - Never styled as a status, score or verdict.

**Done when:** a UI check finds no fly-influenced list, ordering or selection rendered without its badge. Turning the fly component off changes only the labeled ordering or selection.

## Invariants to test before the demo

- Only the current task owner can split. The previous owner is refused after acceptance.
- Every requirement stays with the task or goes to exactly one active piece. Double-covering acceptance is blocked.
- Total cuts never exceed the starting price. No acceptance makes a remainder negative.
- A piece's public payload never contains upstream fields, even when new fields are added upstream.
- No account in a payer chain can bid on the piece.
- A client's responses never include pieces its task owner split off.
- Suggestions exist only with cost basis rates. Thresholds come from config and are printed.
- Unavailable evidence renders "not checked". Suppliers are counted only by UEI.
- Sealed offers stay sealed after a mode change on any piece.
- Every fly-influenced result is labeled where it appears.

## Demo acceptance

Plan2's demo, run in fresh browsers on three devices:

1. GovCon accepts Prime A's offer, and ownership moves.
2. Prime A splits off a piece from Ways to save, or manually if nothing qualifies, with the reason shown.
3. Sub B's offer is accepted, and Sub B sees its own Split button.
4. All three money views reconcile.

The buyer's pre-acceptance split is rehearsed but optional live. Record a backup.
