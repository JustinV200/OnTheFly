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

---

## Part 2: AR Physical-Store Shopping (Phone Camera / Web)

### Core Idea
Use the phone's camera through the browser (web-based AR, no native app required) to overlay useful information directly onto items seen in a physical store.

### 1. Live Item Detection
- Camera feed identifies items relevant to the user's active shopping list / budget.
- Relevant items get a bounding box drawn over them in the camera view.

### 2. Box Overlay Info
- Each box shows/links to:
  - Reviews for that item
  - Price match info (is this price competitive vs. online/other stores?)

### 3. Tap-to-Expand Panel
- Tapping a box pulls up a detail panel on screen with the same AI features as Part 1:
  - Budget realism check (does this fit what's left of the budget?)
  - Ask More (chat agent for deep-dive questions on this specific item)
  - Suggest Better Alternatives (cheaper/better-reviewed options, possibly available in the same store or nearby)

---

## Shared Backend / AI Components

Both parts likely share:
- **Shopping list & budget store** — user's lists, budgets, and progress against them.
- **Product data layer** — pricing, specs, and reviews, aggregated from available sources (retailer APIs/scraping, review sites).
- **AI agent layer**:
  - Budget realism assessment (reasoning over list + live pricing data)
  - Ask More conversational research agent (product-scoped Q&A)
  - Alternative suggestion engine (finds comparable items by price/rating/fit)
- **Item recognition** (Part 2 only) — vision model to detect/classify items in a live camera feed and match them to product data.

---

## Suggested Build Order (Hackathon Scope)

Given typical hackathon time constraints, Part 2 (real-time AR item detection) is the highest-risk/highest-effort piece. Suggested phasing:

1. **MVP core (shared):** budget + shopping list data model, basic product/review lookup, budget realism check.
2. **Part 1 extension:** Chrome extension UI wired to the MVP core — suggested items popup, reviews display, budget realism, Ask More chat.
3. **Part 2 demo:** even a limited AR demo (e.g. detecting 1-2 known object types, or QR/barcode-based lookup instead of full live object detection) would demonstrate the concept without requiring a production-grade vision pipeline.

---

## Open Questions
- What product/review data source(s) are available (API access, scraping, or a mocked dataset for the demo)?
- For Part 2, is real-time object detection in scope, or is a simpler trigger (barcode scan, manual point-and-tap) acceptable for a hackathon demo?
- Single-user or shared/family budgets and lists?
