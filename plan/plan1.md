# Plan 1: On the Fly — Procurement Planning and Visual Audit

## Concept

On the Fly solves one connected problem:

> A team has a fixed budget and shopping list. On the Fly helps the team decide what to buy, tracks what it actually bought, and visually audits whether the plan matches reality.

This keeps the original procurement-assistant concept—budget, list, recommendations, and actual spend—while giving the camera a practical role after the purchase. It is not a generalized asset-management product.

```text
                 ON THE FLY

       “I have $4,000 and need to
              equip two hires”
                       │
                       ▼
             BUDGET + SHOPPING LIST
                       │
                       ▼
                AI RESEARCH LAYER
        best fit / budget / reviews / specs
        alternatives / historical company spend
                       │
                       ▼
                 PURCHASE PLAN
                  $3,870 / $4,000
                       │
                       ▼
              CARD / FINANCIAL DATA
                  actual company spend
                       │
                       ▼
                  LIVE AUDIT MODE
                  phone camera sweep
                       │
              ┌────────┴────────┐
              ▼                 ▼
        standard vision      fly model
        identifies items     motion/attention
              └────────┬────────┘
                       ▼
                 RECONCILIATION

             ✓ Laptop bought
             ✓ Monitor bought
             ✓ Keyboard bought
             ? Mouse still needed
             ⚠ Extra monitor detected
```

## Who It Is For

**A team lead spending company money against a defined budget.** Examples include new-hire equipment, an office setup, or supplies for a team offsite.

The demo centers on one concrete job:

> Equip two new hires with a $4,000 budget, select the right products, track the resulting card spend, and verify that all planned items arrived.

The four questions the product answers are:

1. What do we need?
2. What should we buy given our budget?
3. What did we actually spend?
4. Did everything we planned and paid for actually show up?

---

## Part 1: Budget, List, and Purchase Plan

Part 1 remains the core of the original product.

### 1. Budget and Shopping List

The user creates a purpose-specific budget, for example:

> **2 New-Hire Setups — Budget: $4,000**

They build a quantity-aware shopping list:

- 2 laptops
- 2 monitors
- 2 keyboards
- 2 mice
- 2 headsets

The interface shows planned cost, actual spend, remaining budget, and item status in one place.

### 2. AI Research and Recommendations

For each category or candidate product, On the Fly combines:

- Current product prices, specifications, ratings, and review summaries
- Alternatives that better satisfy the list and budget
- Typical market prices
- Historical prices the company has paid for similar purchases
- The remaining budget and every other item still required

Historical financial data is a research signal, not a separate product. The system answers both:

- “What does the market say is a good price?”
- “What has this company actually paid before?”

An example assessment:

> Your current plan is about $620 over budget. These monitors are poor value relative to comparable alternatives, and your company has historically paid $430–$520 for similar monitors. Swap these two items to bring the projected total to $3,870.

### 3. Budget Realism

The plan is evaluated as a whole rather than treating each product recommendation independently. The assistant:

- Estimates the total cost of the current list
- Identifies the line items creating the overage
- Warns when a candidate price is materially above market or company history
- Suggests specific substitutions
- Recalculates the projected total after each change
- Preserves required quantities and user constraints

### 4. Product-Scoped “Ask More” Agent

The user can ask focused follow-up questions such as:

- Is this durable enough for daily use?
- Is there a better-value alternative?
- Does it work with our existing docks?
- Is this price unusually high?

The agent researches reviews, specifications, comparisons, and the company's relevant spend history, then returns a concise recommendation with supporting evidence.

### 5. Purchase Plan

Accepted recommendations become the purchase plan. Each planned line records:

- Category and quantity
- Selected product
- Expected unit and total price
- Required constraints
- Purchase status
- Reconciliation status

This plan is the shared reference for card transactions and the camera audit.

### 6. Financial Data and Actual Spend

Card transactions update the budget automatically. The app codes against a `TransactionSource` interface so the Rho sandbox and a controlled demo source use the same downstream logic.

- **`RhoSource`** reads real Rho sandbox transactions.
- **`MockSource`** emits the same response shape and supports an on-cue demo transaction.

The financial feed supplies merchant, amount, card, and time—not dependable SKU-level line items. Therefore:

- Transactions are automatically attributed to the most likely active budget using merchant, timing, card, and amount.
- Actual spend and remaining budget update immediately.
- The user confirms which planned items a transaction covered.
- Receipt extraction may prefill that confirmation when an itemized receipt is available.
- The system must not claim that a card transaction alone proves a particular physical item arrived.

Historical transactions are also normalized into category-level price ranges so the research layer can compare a candidate with prior company purchases.

---

## Part 2: Compound Eye — Live Camera and Audit

The camera is not a separate AR shopping gimmick. It is the visual layer for the same purchase plan and works in two explicit states.

```text
BEFORE PURCHASE
“What should I buy?”

AFTER PURCHASE
“Did what we planned and paid for actually show up?”
```

### Mode A: Before-Purchase Check

Point the camera at a candidate product in a store or stockroom. The app identifies the item and compares it with the active plan.

Example overlay:

```text
Dell 27-inch monitor
Shopping list: ✓ Monitor needed
Remaining budget: $1,280
Shelf price: $499
Typical price: about $430
Company previously paid: $449

WAIT — mediocre value
Better option: $399
```

The user can open the same reviews, alternatives, and Ask More experience available in Part 1. This mode supports a buying decision; it does not automatically approve a purchase.

### Mode B: After-Purchase Audit

The user sweeps the phone camera across the completed setup or delivery area. Detected objects are reconciled against the purchase plan and confirmed transaction data.

Example result:

```text
Laptop   ✓
Monitor  ✓
Keyboard ✓
Mouse    • missing

7 of 8 planned items visually accounted for
$3,721 actual spend
$279 budget remaining
```

The audit distinguishes between three facts:

- **Paid:** supported by financial data and user item attribution
- **Seen:** detected during the current or a saved visual audit
- **Reconciled:** both planned and accounted for through the available evidence

An unexpected item can be flagged for review, but vision alone must not label it fraud, duplicate billing, or a company asset.

### Live Overlay

Relevant objects receive tracked bounding boxes. Each overlay can show:

- Planned quantity and quantity seen
- Needed, paid, seen, or reconciled state
- Candidate price versus typical and historical prices in before-purchase mode
- Missing or unexpected-item warning in after-purchase mode
- A tap target for product and reconciliation details

---

## The Fruit-Fly Model's Narrow Responsibility (Compound Eye)

The fly-inspired neural network — branded **Compound Eye** — has one job in the live camera pipeline:

> Determine when and where the scene changed enough to warrant deeper semantic analysis.

It does **not** make purchase recommendations, perform financial reasoning, or identify products by itself.

```text
LIVE VIDEO
    │
    ├── fly neural network (Compound Eye)
    │      ↓
    │   motion / visual-interest signal
    │      ↓
    │   region and moment worth inspecting
    │
    └── standard CV / vision-language model
           ↓
       identify and classify object
           ↓
       reconcile with purchase plan
```

As the phone pans across a shelf or desk, the fly layer produces an attention spike and candidate region. The app crops that region and invokes the more expensive semantic model only when useful instead of sending every frame.

This is a hypothesis to test, not a performance claim. The benchmark compares the fly layer with conventional motion/saliency methods on:

- Semantic-model calls per minute
- Detection and reconciliation recall
- Time to first useful identification
- End-to-end latency
- False attention triggers

If the fly model does not improve the pipeline enough, standard motion gating remains the production path. **Fly Mode** can still visualize the model's real response to the live camera while standard vision performs recognition. The product must remain reliable regardless of the benchmark result.

---

## Mushroom Body — Instance Memory and Catalog Match

Two jobs from one circuit. The fly's mushroom body expands a dense input into a large sparse code, and that code serves two separately published purposes: similarity search (FlyHash — Dasgupta, Stevens & Navlakha, *Science*, 2017) and novelty detection (Dasgupta, Sheehan, Stevens & Navlakha, *PNAS*, 2018). Different algorithms sharing a mechanism, and they earn very different places in this plan.

**The shared mechanism:**
1. Take a feature vector for the item.
2. Project it through a large, sparse random projection — each output dimension sees only a small random subset of input dimensions, as the fly's ~2000 Kenyon cells do with ~50 random projections each.
3. Keep only the top-k winner dimensions (winner-take-all), producing a small sparse binary code — the *tag*.
4. Compare tags by overlap. That is the entire operation.

### Job 1: Instance memory for the audit count

Vision Pipeline step 8 requires updating the audit count "without double-counting a tracked object across frames," and Mode B's headline output is a count — *7 of 8 planned items visually accounted for*. That number is correct only if the app can continuously answer one question: **is this the same physical object I already counted, or a new one?**

Step 4's standard detection and tracking answers it only while an object stays visible and roughly in place. A sweep breaks exactly that assumption — pan off a monitor and back, and geometric tracking (IoU, centroid) has nothing left to match on. Re-count it and the audit reports two monitors where there is one: a wrong number in the demo's primary output, not a cosmetic glitch. Occlusion and re-entry are the normal case when someone walks a desk with a phone, not the edge case.

Novelty detection answers it directly. Tag each detected crop, compare against the tags already seen in this audit session, and the overlap gives familiar-or-new. It is content-based, so re-entry survives. It is fuzzy, so the same monitor from a second angle still reads as familiar — which an exact hash never would.

**The two camera modes want opposite decay.** The biological version carries a decaying familiarity trace. That decay is a feature in Before Purchase, where an item seen 30 seconds ago should drift back toward novel so a stale price overlay refreshes. It is a liability during an audit, where forgetting inside a sweep *is* double-counting. Same structure, two time constants: short decay before purchase, none within a single audit sweep.

**Same status as Compound Eye — a benchmarked hypothesis, not a claim.** Conventional appearance distance over the same descriptor is the baseline and the fallback, behind the same interface. Benchmark on double-count rate across a pan-away-and-return sweep, re-identification accuracy after occlusion, and semantic-model calls saved. If the tag variant does not beat the baseline, the baseline ships and nothing else in the audit changes.

**Failure is safe either way.** Bias the threshold toward "novel" and the worst case is a redundant vision call plus a re-counted object surfaced for user confirmation — which step 7 already requires the audit to support.

**Input features.** Image embeddings stay out of scope, so the tag is built from a cheap hand-rolled crop descriptor: downsampled cells, per-cell colour histogram, gradient orientation. Roughly 60–100 dimensions, no extra model load, computed on a crop the detector already produced. This is *closer* to the biology than a learned embedding would be — the fly's input layer is about 50 crude chemical receptor channels, not a learned representation.

### Job 2: Catalog retrieval — side demo

**Purpose:** narrow "what is this item / what's a good match or alternative" down to a short candidate list, before handing that list to Claude for the actual judgment call. The feature vector here is a text embedding of title/description, compared by overlap / Hamming distance between tags.

**What ships, and what's honest about it.** At our catalog size (hundreds of items, not millions), brute-force cosine similarity is already microseconds and has strictly better recall than any LSH scheme — FlyHash buys nothing at this scale, and the "no model inference" framing is misleading anyway, since the query still needs an embedding and *that* is the real latency cost, not the hash.

So: **cosine is the live retrieval path. FlyHash ships alongside it as a runnable side-by-side** — same query, both retrievers, showing the codes and the overlap. It's ~30 lines, it's a genuinely good story, and it's real. Nothing blocks on it.

Image→catalog matching is **out of scope** — it needs CLIP or equivalent, which is a whole extra dependency. Text-side only.

### Three fly components, not one

Easy to conflate. They do different things and carry different risk:

| Component | Decides | Status |
|---|---|---|
| **Compound Eye** attention gating | *Where and when* to look | Benchmarked hypothesis; conventional motion gating is the fallback |
| **Mushroom Body** instance memory | *Whether this is something already seen* | Benchmarked hypothesis; appearance distance is the fallback |
| **Mushroom Body** FlyHash retrieval | *Which catalog entries are nearest* | Side demo; cosine is the live path |

None of them performs semantic identity — standard vision does that, and none of them is a single point of failure.

---

## System Architecture

### Frontend

**Decision: no Chrome extension.** A Manifest V3 build means a separate manifest, Vite extension config, service worker messaging, content script injection, storage sync, and a separate deploy — all to deliver features a web page delivers identically. The camera view has to be a mobile web page regardless. One responsive web app covers both, cuts a large slice of the work, and loses nothing that matters for the demo.

- React + TypeScript responsive web app, bundled with Vite
- Desktop-first planning and spend dashboard
- Mobile camera view using `getUserMedia`
- `<canvas>` overlay over live video
- Explicit toggle between Before Purchase and Audit modes
- Live reconciliation summary tied to the active plan
- In-session instance memory so the audit count survives panning away and back

### Backend

- Python + FastAPI — async REST, Pydantic models for request/response shapes that line up with the AI layer's structured outputs
- Budget, list, purchase-plan, and audit-session store
- Product catalog and product-research layer
- Transaction ingestion and budget attribution
- Historical-spend aggregation by normalized category
- Reconciliation engine that keeps planned, paid, and seen evidence separate
- **Hosting:** whatever stands up fastest (Render / Fly.io / Railway). Needs to be HTTPS and reachable from a phone on day one.

### Vision Pipeline

1. Capture the live browser video stream.
2. Run the fly model and a conventional baseline on sampled frames.
3. Use the selected gating signal to choose a frame and region of interest.
4. Run standard object detection for bounding boxes and tracking.
5. Use a vision-language model on a crop only when category or product identity needs refinement.
6. Match the result to the active purchase plan.
7. Ask for user confirmation when identity or quantity is uncertain.
8. Update the audit count without double-counting a tracked object across frames — see [Mushroom Body instance memory](#mushroom-body--instance-memory-and-catalog-match), which is what has to survive panning away and back.

For the demo, use objects `coco-ssd` already recognizes reliably — laptop, keyboard, mouse, tv, chair, backpack, book, clock, bottle, cup, potted plant, and scissors — so detection needs no custom model. Do not imply SKU-level certainty when only a broad object class was detected.

### AI Layer

- Budget realism assessment
- Product alternatives and tradeoff explanation
- Product-scoped research Q&A
- Historical-price comparison
- Vision-based product/category refinement
- Transaction-to-budget suggestion with user-confirmed item attribution

Every reasoning step above runs through the Claude API (`claude-opus-5`), including the "Ask More" agent's live research via the `web_search_20260209` server tool. Use structured outputs anywhere the application consumes model results — never parse prose. Every recommendation should return a decision, reasons, confidence, and cited or stored evidence.

### Data

- Postgres via Supabase; hardcoded demo user, no auth — auth is a classic hackathon time sink with zero demo value.
- Curated JSON catalog scoped to the ~12 demo items, seeded by hand. Retailer scraping is blocked and ToS-hostile; SerpApi/Rainforest mean signup, cost, and rate limits for data we can just write down. Be upfront with judges that the catalog is seeded — it's the right call, not a shortcut to hide.
- Live web research for qualitative questions and fresh comparisons, via Claude's web search tool in Ask More.
- `TransactionSource` abstraction with Rho and mock implementations (below).
- Saved audit observations with timestamp, category, confidence, and optional frame crop.

### Transactions

Two implementations of `TransactionSource` (see Part 1 §6). Rho's schema is the contract both conform to. Pick the source with one env var (`TRANSACTION_SOURCE=rho|mock`). Default to `mock` in development so nobody is blocked by network or conference wifi, and have the Rho path working and demonstrable.

#### `RhoSource` — the real integration

**Verified: the sandbox is open and needs no account.**

```
https://rhoapi-sandbox.rho.co/api/v1/     any non-empty bearer token, no signup, no KYC
```

`GET /accounts` and `GET /transactions` both return data immediately. Production (`https://rhoapi.rho.co/api/v1/`) needs a real token created in Rho banking settings by an Admin or Account Owner behind a 2FA challenge — not something to depend on for the demo.

**What's in the sandbox, precisely:**
- Transaction fields: `counterparty_name`, `amount` (integer cents, negative for debits), `initiated_at`, `posted_at`, `status`, `transaction_type`, `card_id`, `card_name`, `user_full_name`, `memo`, `note`, `attachments[]`. Cursor-paginated via `page.next_page_token`.
- **~12 card transactions exist in the entire sandbox**, and they are static and historical (dated June 2026). New ones can't be generated, so no live "transaction lands, budget updates" moment is possible against Rho. That's `MockSource`'s job, below — it's the reason the mock exists rather than a fallback.
- Merchants are business travel and office supply: `Northstar Office Supply` ($53.31, $49.47), `Midtown Parking Services`, `Graceway Car Service`, `Island Resort Maldives`, `Teamline Software`. Northstar is the natural anchor for the demo.
- `GET /transactions/{id}/files/{file_id}` works and returns a signed download URL for receipt attachments. **The sandbox PDFs are one-line stubs** (`"Rho API Sandbox - Fictional Document | ... | Amount -4947 USD"`) with no line items. The endpoint and the plumbing are real; the data isn't. To demo receipt line-item extraction we supply our own receipt PDF through the same code path.
- **No webhooks documented — ingestion is poll-only.** Poll on an interval, diff against what's been seen.

#### `MockSource` — the development and demo path

A local implementation of the same interface, emitting the same schema. Roughly:

- **Fixture:** a JSON file of transactions shaped exactly like Rho's, with merchants drawn from the demo catalog and amounts that fit the $4,000 budget story. Dated relative to now, not hardcoded, so the demo never looks stale.
- **Inject endpoint:** `POST /mock/transactions` appends a transaction and it shows up on the next poll. This is the live demo moment — a purchase posts, the budget moves, on cue rather than on a timer.
- **Receipts:** serves a real itemized receipt PDF through the same `files/{file_id}` shape, which is what makes line-item extraction demoable at all.
- **Same poll loop, same matching code.** If the mock and Rho ever disagree in shape, that's a bug in the mock — Rho's schema is the spec.

### Dev/Deploy

- **Version control:** Git/GitHub (this repo).
- **Packages:** two package managers, one repo — npm for the frontend (`frontend/`), a Python venv + `pip`/`poetry` for the backend (`backend/`). No workspace tooling to share between them since the languages differ.

---

## Reconciliation Model

The reconciliation state should be explainable and conservative.

| Plan state | Financial evidence | Visual evidence | UI result |
|---|---|---|---|
| Planned | None | None | Needed |
| Planned | Confirmed purchase | None | Paid, not yet seen |
| Planned | None | Seen | Seen, purchase unconfirmed |
| Planned | Confirmed purchase | Seen | Reconciled |
| Not planned | None or unknown | Seen | Unexpected; review |

Quantity matters. A plan for two monitors is not complete after detecting one. Repeated detections of the same tracked object do not increment the count. For the hackathon, a user confirmation step resolves ambiguous counts or identities.

---

## End-to-End Demo

1. A team lead says, **“We have $4,000 to equip two new hires.”**
2. They build a list for two laptops, monitors, keyboards, mice, and headsets.
3. On the Fly estimates the original plan at **$4,760** and identifies the expensive monitors and accessories.
4. It uses current product research plus historical company spend to recommend alternatives.
5. The accepted purchase plan becomes **$3,890**.
6. Show the real Rho sandbox integration and its historical business transactions.
7. Inject demo purchases through the same transaction interface; actual spend becomes **$3,847**.
8. Pick up the phone and sweep the completed desks.
9. The audit finds the laptops, monitors, and keyboards, but one mouse is missing.
10. The result reads: **7/8 purchases reconciled. One item still missing. $153 remaining.**
11. Turn on Fly Mode to show the live fruit-fly attention response alongside the regions sent for semantic recognition.

The audience sees one uninterrupted story: plan, research, buy, spend, and verify.

---

## Brand: Fruit Fly Vocabulary

*Drosophila melanogaster* is one of the most studied nervous systems in neuroscience — a tiny brain with extremely fast, well-characterized reflexes. We use it as both a real technical inspiration and a naming convention, so the theme is more than skin-deep without adding risk where quality or latency actually matter:

| Codename | Real fly anatomy | Maps to |
|---|---|---|
| **Compound Eye** | Wide-field, fast-motion-detecting vision | The fly-inspired attention-gating layer in the live camera pipeline — decides where/when to look, benchmarked against conventional motion gating (see [The Fruit-Fly Model's Narrow Responsibility](#the-fruit-fly-models-narrow-responsibility-compound-eye)) |
| **Mushroom Body** | Kenyon cells — sparse coding, novelty detection | Two genuine fly-brain algorithms: instance memory that keeps the audit count from double-counting (benchmarked, conventional fallback), and the FlyHash catalog matcher (side-by-side demo — cosine is the live path) |
| **Halteres** | Balance organs used for flight stability | Budget realism / balance check |
| **Proboscis** | Feeding tube used to sample and taste | The "Ask More" research agent |
| **Metabolism** | Consumption and energy use | Transaction sync — what's actually been spent, via the Rho API |

Compound Eye and Mushroom Body map to real technical components; the rest is naming layered on features already planned above. Compound Eye's attention gating and Mushroom Body's instance memory are both benchmarked hypotheses with conventional fallbacks behind the same interface — Mushroom Body's FlyHash retrieval path is a side demo that nothing depends on. None of them sits between a user and the reasoning that needs to be fast and correct.

---

## Build Order

1. **Procurement spine:** budget, quantity-aware list, seeded catalog, projected total, and alternatives.
2. **Transactions:** common `TransactionSource`, mock purchases, Rho sandbox path, actual-spend calculation, and user item attribution.
3. **Reconciliation state:** model planned/paid/seen/reconciled separately and build the dashboard summary.
4. **Camera audit spike:** on a real phone over HTTPS, detect and count the exact demo objects without double-counting. Land conventional appearance-distance instance memory here — it is the baseline the fly variant is measured against in step 6.
5. **Before-purchase camera state:** add remaining-budget, typical-price, historical-price, and alternative overlays.
6. **Fly layers:** connect Compound Eye's live signal to region/frame selection, add Mushroom Body instance memory, and build the baseline comparison for both.
7. **Polish:** receipt-assisted attribution, saved audit evidence, unexpected-item review, and failure-state handling.

Each stage leaves a coherent demo. If camera recognition is weak, the planning and spend workflow still works and the audit uses user confirmation. If the fly model underperforms, conventional gating handles recognition while Fly Mode truthfully shows the experimental response.

---

## Scope Decisions

| Decision | Reason |
|---|---|
| Business procurement, not consumer shopping | Matches company card data and the sponsor context |
| One plan-to-audit workflow | Keeps the product coherent and the demo easy to follow |
| Camera supports before- and after-purchase states | Reuses one interface for buying decisions and verification |
| Fly components gate attention and track instance identity, never semantic identity | Two narrow, testable perception roles. Each is benchmarked against a conventional baseline that ships if the fly path loses, so reliability never rests on the fly model |
| Standard vision performs identity and boxes | Uses the right tool for semantic recognition |
| Audit count uses instance memory, not geometric tracking alone | Panning away and back defeats IoU/centroid tracking, and a re-counted object is a wrong number in the audit's headline output |
| Transactions prove spend, not physical arrival | Card data does not contain enough evidence for visual reconciliation |
| Separate planned, paid, and seen states | Prevents the UI from overstating certainty |
| Mock and Rho share one interface | Enables a controlled demo while preserving the real integration |
| Curated demo catalog and detector-friendly objects | Makes the live demo repeatable |
| Cosine ships live; FlyHash ships as a side-by-side | Catalog matching needs recall at our scale, not LSH's sublinear-search tradeoff; FlyHash stays a genuine, honest demo rather than the real path |
| No generalized asset management | Warranties, offboarding, depreciation, and inventory administration are future products, not this MVP |

---

## Success Criteria

The MVP succeeds if a judge can watch one team:

- Create a fixed budget and quantity-aware list
- Receive a credible over-budget warning and better alternatives
- See current market evidence alongside historical company spend
- Convert recommendations into a purchase plan
- Watch actual company-card spend update the budget
- Scan a physical setup and understand what is paid, seen, reconciled, or missing
- Observe the fly model performing a real, narrow attention task without being asked to trust an unsupported superiority claim

## Future Features, Not MVP

- General asset inventory
- Warranty and lifecycle management
- Employee assignment and offboarding
- Accounting depreciation
- Procurement approvals and vendor management
- Automated fraud or loss conclusions

These may follow naturally later, but they should not enter the hackathon build or pitch.
