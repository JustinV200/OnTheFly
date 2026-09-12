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

## The Fruit-Fly Model’s Narrow Responsibility

The fly-inspired neural network has one job in the live camera pipeline:

> Determine when and where the scene changed enough to warrant deeper semantic analysis.

It does **not** make purchase recommendations, perform financial reasoning, or identify products by itself.

```text
LIVE VIDEO
    │
    ├── fly neural network
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

## System Architecture

### Frontend

- React + TypeScript responsive web app
- Desktop-first planning and spend dashboard
- Mobile camera view using `getUserMedia`
- `<canvas>` overlay over live video
- Explicit toggle between Before Purchase and Audit modes
- Live reconciliation summary tied to the active plan

### Backend

- Node.js + TypeScript REST API
- Budget, list, purchase-plan, and audit-session store
- Product catalog and product-research layer
- Transaction ingestion and budget attribution
- Historical-spend aggregation by normalized category
- Reconciliation engine that keeps planned, paid, and seen evidence separate

### Vision Pipeline

1. Capture the live browser video stream.
2. Run the fly model and a conventional baseline on sampled frames.
3. Use the selected gating signal to choose a frame and region of interest.
4. Run standard object detection for bounding boxes and tracking.
5. Use a vision-language model on a crop only when category or product identity needs refinement.
6. Match the result to the active purchase plan.
7. Ask for user confirmation when identity or quantity is uncertain.
8. Update the audit count without double-counting a tracked object across frames.

For the demo, use objects that standard detectors handle reliably: laptop, keyboard, mouse, monitor/TV, chair, backpack, book, bottle, cup, and scissors. Do not imply SKU-level certainty when only a broad object class was detected.

### AI Layer

- Budget realism assessment
- Product alternatives and tradeoff explanation
- Product-scoped research Q&A
- Historical-price comparison
- Vision-based product/category refinement
- Transaction-to-budget suggestion with user-confirmed item attribution

Use structured outputs anywhere the application consumes model results. Every recommendation should return a decision, reasons, confidence, and cited or stored evidence.

### Data

- Postgres via Supabase; hardcoded demo user, no auth
- Curated demo catalog for reliable product matching
- Live web research for qualitative questions and fresh comparisons
- `TransactionSource` abstraction with Rho and mock implementations
- Saved audit observations with timestamp, category, confidence, and optional frame crop

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

## Build Order

1. **Procurement spine:** budget, quantity-aware list, seeded catalog, projected total, and alternatives.
2. **Transactions:** common `TransactionSource`, mock purchases, Rho sandbox path, actual-spend calculation, and user item attribution.
3. **Reconciliation state:** model planned/paid/seen/reconciled separately and build the dashboard summary.
4. **Camera audit spike:** on a real phone over HTTPS, detect and count the exact demo objects without double-counting.
5. **Before-purchase camera state:** add remaining-budget, typical-price, historical-price, and alternative overlays.
6. **Fly attention layer:** connect its live signal to region/frame selection and build the baseline comparison.
7. **Polish:** receipt-assisted attribution, saved audit evidence, unexpected-item review, and failure-state handling.

Each stage leaves a coherent demo. If camera recognition is weak, the planning and spend workflow still works and the audit uses user confirmation. If the fly model underperforms, conventional gating handles recognition while Fly Mode truthfully shows the experimental response.

---

## Scope Decisions

| Decision | Reason |
|---|---|
| Business procurement, not consumer shopping | Matches company card data and the sponsor context |
| One plan-to-audit workflow | Keeps the product coherent and the demo easy to follow |
| Camera supports before- and after-purchase states | Reuses one interface for buying decisions and verification |
| Fly network only gates visual attention | Gives it a legitimate, testable perception role without putting reliability at risk |
| Standard vision performs identity and boxes | Uses the right tool for semantic recognition |
| Transactions prove spend, not physical arrival | Card data does not contain enough evidence for visual reconciliation |
| Separate planned, paid, and seen states | Prevents the UI from overstating certainty |
| Mock and Rho share one interface | Enables a controlled demo while preserving the real integration |
| Curated demo catalog and detector-friendly objects | Makes the live demo repeatable |
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
