# Plan 1: Smart Shopping Assistant

## Concept

A shopping assistant that helps people set a budget, build a shopping list (for a specific task or general use), and make smarter purchase decisions — first as a Chrome extension for online shopping, then extended into an augmented-reality experience for shopping in physical stores.

---

## Part 1: Chrome Extension (Online Shopping)

### 1. Budget + Shopping List Setup
- User creates a budget, either for a specific task (e.g. "camping trip", "dorm setup") or as a standing/general budget.
- User builds a shopping list of items they need, tied to that budget.

### 2. Suggested Items Popup
- While browsing (or from the extension popup), surface suggested items relevant to the active shopping list.
- Suggestions should be relevant to what the user is currently looking at / searching for.

### 3. Reviews Aggregation
- For each suggested or listed item, pull together review data (ratings, review highlights/summary) so the user doesn't have to leave the page to vet a product.

### 4. Budget Realism Assessment
- Given the shopping list + budget, an AI assessment of whether the budget is realistic for the items listed (e.g. "your $200 budget is tight — these items typically run $260+").
- Should flag which items are the biggest risk to the budget and possibly suggest cheaper alternatives.

### 5. "Ask More" Agent
- A chat-style agent scoped to a specific product.
- User can ask follow-up questions ("is this durable?", "is there a better value alternative?", "does this work for X use case?") and the agent does research (reviews, specs, comparisons) to answer.

### 6. Transaction Sync → Auto Budget Update
- Pull card/account transactions via the **Rho API** (read-only) so real purchases are picked up automatically instead of relying on the user to manually log what they bought.
- When a new transaction comes in, match it against the active shopping list (merchant name, amount, timing, and item still-open status) to figure out which list item it corresponds to.
- On a match: mark that item as purchased, deduct the actual spent amount from the budget, and recompute remaining budget / realism for what's left on the list.
- Ambiguous matches (e.g. multiple open items near the same price at the same merchant) should prompt the user to confirm which item it was rather than guessing silently.
- This makes the budget live and accurate — it reflects what was actually spent, not just what was planned — and feeds back into the realism assessment (e.g. "you've spent more than planned on X category, tighten up elsewhere").

---

## Part 2: AR Physical-Store Shopping (Phone Camera / Web) — Full Live Demo

### Core Idea
Use the phone's camera through the browser (web-based AR, no native app required) to overlay useful information directly onto items seen in a physical store, live, in real time — not a barcode-scan or point-and-tap fallback.

### 1. Live Item Detection
- Camera feed continuously identifies items relevant to the user's active shopping list / budget as the phone is panned around the store.
- Relevant items get a bounding box drawn over them in the camera view, tracked frame-to-frame as the camera moves.

### 2. Box Overlay Info
- Each box shows/links to:
  - Reviews for that item
  - Price match info (is this price competitive vs. online/other stores?)

### 3. Tap-to-Expand Panel
- Tapping a box pulls up a detail panel on screen with the same AI features as Part 1:
  - Budget realism check (does this fit what's left of the budget?)
  - Ask More (chat agent for deep-dive questions on this specific item)
  - Suggest Better Alternatives (cheaper/better-reviewed options, possibly available in the same store or nearby)

### Technical Approach
- **Camera access:** `getUserMedia` (rear camera) in a mobile browser page — no native app.
- **Detection loop:** grab frames from the video stream at a fixed interval and run them through a vision model to detect/classify items and return bounding boxes + labels.
  - Fastest path for a live demo: run a lightweight on-device model (e.g. a TensorFlow.js / ONNX Runtime Web object detector) directly in the browser for real-time box tracking, then use a more capable model (multimodal LLM / vision API call) only to identify *what* a boxed item specifically is and pull matching product data — keeps the frame-rate-critical part fast and the accuracy-critical part async.
  - Alternative: send frames straight to a backend vision model on an interval (e.g. every 500ms–1s) if on-device detection proves too slow/complex to set up in the hackathon window; boxes are interpolated/held between server responses so the overlay still feels live.
- **Overlay rendering:** `<canvas>` positioned over the `<video>` element, redrawn each frame with current box positions; tap/click hit-testing against the current box list opens the detail panel.
- **Matching to product data:** detected label/crop → product data layer (same one Part 1 uses) for price, reviews, and price-match lookup.
- **Demo constraints to plan around:** a curated, known set of product categories/items (the demo store shelf) will detect far more reliably live than fully open-vocabulary detection — worth deciding the demo item set early so the model/prompt can be tuned to it.

---

## Shared Backend / AI Components

Both parts likely share:
- **Shopping list & budget store** — user's lists, budgets, and progress against them.
- **Product data layer** — pricing, specs, and reviews, aggregated from available sources (retailer APIs/scraping, review sites).
- **Transaction sync & matching** — reads card transactions via the Rho API, matches them to open shopping-list items, and updates the budget (spent vs. remaining) automatically when a match is found.
- **AI agent layer**:
  - Budget realism assessment (reasoning over list + live pricing data + actual spend from transactions)
  - Ask More conversational research agent (product-scoped Q&A)
  - Alternative suggestion engine (finds comparable items by price/rating/fit)
  - Transaction-to-item matching (fuzzy match on merchant/amount/timing; asks the user to confirm ambiguous cases)
- **Item recognition** (Part 2 only) — vision model to detect/classify items in a live camera feed and match them to product data.

---

## Tech Stack

### Chrome Extension (Part 1)
- **Manifest V3** extension — popup UI + content script (to read/annotate the page being browsed) + background service worker.
- **UI:** React + TypeScript, bundled with Vite (fast rebuilds, good extension-dev support).
- **Storage:** `chrome.storage.local`/`sync` for lists/budgets on-device, synced to the backend when online.

### AR Web Demo (Part 2)
- **Delivery:** plain mobile web page (works in Chrome/Safari on a phone) — no native app, no app store friction.
- **Camera:** `getUserMedia` + `<video>` element.
- **On-device detection:** TensorFlow.js (`coco-ssd` or a custom-trained lightweight model) or ONNX Runtime Web, for fast frame-to-frame bounding boxes.
- **Overlay:** `<canvas>` layered over the video, redrawn each frame.
- **Framework:** React (or vanilla TS) — kept light so it doesn't compete with the detection loop for main-thread time.

### Backend / API
- **Runtime:** Node.js + TypeScript, Express or Fastify — simple REST (or tRPC) API shared by both frontends.
- **Hosting:** whatever is fastest to stand up for the hackathon (e.g. Render/Fly.io/Vercel serverless functions).

### AI Layer
- **Claude API (Anthropic)** for the reasoning-heavy pieces:
  - Budget realism assessment (reasoning over list + pricing data)
  - Ask More agent (product-scoped conversational research, with web search/tool use for specs and comparisons)
  - Alternative-item suggestions
  - Item identification from a camera crop (Claude's vision input) when the on-device model needs a second opinion on *what* an object is, not just that something is there.

### Data
- **Database:** Postgres (e.g. via Supabase, which also gives auth for free) for users, budgets, shopping lists, cached product/review data, and transaction records.
- **Product/review data:** a shopping/product-data API if available (e.g. SerpApi, Rainforest API, or similar), otherwise a mocked/curated dataset scoped to the demo's item set.

### Transactions
- **Rho API** (docs.rho.co) for read-only access to card spend, ACH, wires, and refunds on the linked Rho business banking/card account — this is our transaction source, not a generic bank-aggregator like Plaid.
- **Auth:** scoped, revocable API access tokens (IP allowlist support); OAuth 2.0 is also available for partner-style customer access if needed.
- **Ingestion:** poll the transactions endpoint (or use a webhook if Rho exposes one) to pick up new transactions, run them through the matching logic, and update the relevant budget.
- Since Rho is business banking/corporate cards rather than a personal-bank aggregator, the demo account should be a Rho account/card set up for this purpose (real or provided test credentials) rather than an arbitrary personal bank login.

### Dev/Deploy
- **Version control:** Git/GitHub (this repo).
- **Package management:** npm/pnpm workspaces if the extension, AR frontend, and backend live in one monorepo.

---

## Suggested Build Order (Hackathon Scope)

Part 2's live detection loop is the highest-risk/highest-effort piece and the thing most likely to eat the clock, so it should be spiked first — everything else is more straightforward to build once the core is proven.

1. **Spike the live detection loop first:** camera → detection → bounding box overlay on a couple of real objects, before building anything else. This is the riskiest technical unknown; de-risk it early rather than discovering problems late.
2. **MVP core (shared):** budget + shopping list data model, basic product/review lookup, budget realism check.
3. **Part 2 AR demo:** wire the proven detection loop to the shared product data layer — box → tap → detail panel with reviews, price match, budget realism, Ask More, alternatives.
4. **Part 1 extension:** Chrome extension UI wired to the same MVP core — suggested items popup, reviews display, budget realism, Ask More chat. Lower technical risk than Part 2, so it's fine for this to come after.

---

## Open Questions
- What product/review data source(s) are available (API access, scraping, or a mocked dataset for the demo)?
- On-device detection model (TensorFlow.js/ONNX) vs. periodic backend vision calls — which is more reliable to get working live within the hackathon window?
- What's the demo item set (the specific products/shelf we'll point the camera at)? Deciding this early lets detection be tuned/curated for it instead of aiming for open-vocabulary recognition.
- Single-user or shared/family budgets and lists?
- For the demo, do we have (or can we get) a Rho account/API access token with test transaction data, or do we need to generate real transactions on a Rho card during the hackathon to have something to demo against?
- How strict should transaction-to-item matching be before asking the user to confirm vs. auto-applying? Getting this wrong either annoys the user (too many confirmations) or mis-attributes spend (too aggressive auto-matching).
