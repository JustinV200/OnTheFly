# Plan 1: On the Fly — Procurement Assistant

## Concept

On the Fly helps a team lead set a budget, build an equipment list, and make smarter purchase decisions against real card spend — as a web app for buying online, extended into a live augmented-reality view for buying in physical stores. See [Brand: Fruit Fly Vocabulary](#brand-fruit-fly-vocabulary) below for the naming convention used throughout.

## Who it's for

**A team lead spending company money on a defined budget.** New-hire equipment, an office setup, supplies for a team offsite — a fixed number, a list of things to buy, and a corporate card the spend lands on.

This is deliberate, and it drives most of the decisions below. Rho is business banking and corporate cards, not a personal-bank aggregator: the transaction data we have to work with is business spend, the sandbox is populated with business merchants, and the customer being served is a company. A consumer framing ("camping trip", "dorm setup") would demo against data we don't have, for a user the platform doesn't serve.

Nothing about the feature set changes under this framing. The budget, the list, the reviews, the realism check, the research agent, and the AR view all work the same. Only the customer is different.

**Target demo narrative:** a team lead has $4,000 to equip two new hires. They build the list; On the Fly says the budget is ~$900 short and flags which line items are the risk. They walk an office-supply aisle with the camera up, seeing what's on the list and what's already been bought. Card spend posts to the Rho account and reconciles the budget as it lands.

---

## Part 1: Budget & List Surface (Web App)

### 1. Budget + List Setup
- User creates a budget tied to a purpose (e.g. "2 new-hire setups", "Q3 office refresh") or as a standing departmental budget.
- User builds a list of items needed against that budget.

### 2. Suggested Items
- Surface suggested items relevant to the active list — what's still open, what's commonly bought alongside what's already on it.
- Suggestions respond to what the user is currently looking at or searching for.

### 3. Reviews Aggregation
- For each suggested or listed item, pull together review data (ratings, review highlights/summary) so the user doesn't have to leave the page to vet a product.

### 4. Budget Realism Assessment
- Given the list + budget, an AI assessment of whether the budget is realistic for what's on it (e.g. "your $4,000 budget is ~$900 short — these items typically run $4,900+").
- Flags which items are the biggest risk to the budget and suggests cheaper alternatives.

### 5. "Ask More" Agent
- A chat-style agent scoped to a specific product.
- User can ask follow-up questions ("is this durable enough for daily use?", "is there a better value alternative?", "does this work for X?") and the agent researches (reviews, specs, comparisons) to answer.

### 6. Transaction Sync → Auto Budget Update

Pull card transactions so real purchases update the budget automatically instead of relying on manual logging.

**Two sources, one interface.** Transactions come from a `TransactionSource` the rest of the app codes against — `listTransactions(since)` returning a stream of transaction records. Two implementations satisfy it:

- **`RhoSource`** — the live Rho sandbox. Real integration with the sponsor's actual API, free and open (see Tech Stack below).
- **`MockSource`** — a seeded JSON fixture plus an inject endpoint, emitting the **identical Rho response shape**.

Nothing downstream — matching, budget math, the AR already-bought check — knows or cares which is active. It's a config flag. This is what makes the mock worth having rather than a compromise: the sandbox holds ~12 static transactions that can't be added to, so a live "the charge just posted" demo moment is impossible against it, and its merchants are business travel rather than anything on our catalog. `MockSource` gives us merchants that match the demo list, amounts that match the budget story, and a transaction we can inject on cue mid-demo. `RhoSource` gives us the real integration. Build against the mock, demo the Rho path as real, and keep both working.

**What the data supports.** A card transaction carries merchant and amount, not line items — this is true of the Rho schema and the mock mirrors it rather than inventing richer data we wouldn't have in production:

```json
{"counterparty_name": "Northstar Office Supply",
 "amount": {"amount": -4947, "currency": "USD"},
 "transaction_type": "card_debit", "posted_at": "...",
 "card_name": "Daniel Rivera",
 "attachments": [{"file_id": "...", "file_name": "office-supply-receipt.pdf"}]}
```

There is no SKU, no line-item breakdown, and no MCC. A single $49.47 charge at an office-supply store is routinely four items. **Matching a transaction to one specific list item is therefore not something the data can support**, and designing around it would mean guessing wrong most of the time.

**So matching works at the budget level, not the item level:**
- A new transaction is matched to a **budget** (merchant, timing, card, and which budgets are active), and its amount is deducted from that budget's remaining. This is reliable and needs no guessing.
- Remaining budget and the realism assessment recompute immediately against what's still open on the list.
- **Item attribution is a user action, not an inference.** The transaction shows up as "$49.47 at Northstar Office Supply — which of these did it cover?" with the open list items as checkboxes. One tap, no wrong guesses, and the user is the one who actually knows.
- **Receipt-assisted attribution (stretch):** `GET /transactions/{id}/files/{file_id}` returns a signed download URL for attached receipts. Passing that PDF to Claude as a document input gets line items, which pre-fills the checkboxes above. The Rho sandbox's receipt PDFs are content-free stubs (see Tech Stack), so `MockSource` is what makes this demoable — it serves a real itemized receipt through the same endpoint shape.

---

## Part 2: Compound Eye — AR In-Store View

### Core Idea
Use the phone camera through the browser to overlay useful information onto items on a shelf, live, as the phone is panned — not a barcode scan or a point-and-tap fallback. Same web app as Part 1, different view.

### 1. Live Item Detection
- Camera feed continuously identifies items relevant to the active list as the phone moves.
- Relevant items get a bounding box drawn over them, tracked frame-to-frame.

### 2. Box Overlay Info
Each box shows or links to:
- Reviews for that item
- Price match info (is this price competitive vs. online?)
- **Already-purchased status** — checked against transaction history (Part 1 §6), so something already bought shows a dimmed "already bought" box instead of a buy pitch. Avoids pitching a duplicate of something already expensed.

### 3. Tap-to-Expand Panel
Tapping a box opens a detail panel with the same AI features as Part 1:
- Budget realism check (does this fit what's left?)
- Ask More (product-scoped research agent)
- Suggest Better Alternatives (cheaper or better-reviewed options)

### Technical Approach

**The demo item set is chosen so detection is nearly free.** `coco-ssd` detects 80 fixed COCO classes and will never recognize a specific retail product. Rather than fight that, the demo list is built from items that *are* COCO classes:

> `laptop` · `keyboard` · `mouse` · `tv` (monitor) · `chair` · `backpack` · `book` · `clock` · `bottle` · `cup` · `potted plant` · `scissors`

That is a completely believable new-hire-equipment and office-setup list, and it turns the single riskiest component into the most reliable one. No training, no custom model.

- **Camera access:** `getUserMedia` (rear camera) in a mobile browser. Requires HTTPS on a real phone — tunnel or deploy on day one, don't leave this to demo night. iOS Safari also needs the `playsinline` attribute and a user gesture to start; in-app browsers (Slack, Instagram) block the camera entirely, so demo in real Safari or Chrome on a device we control.
- **Detection loop:** `coco-ssd` via TensorFlow.js in-browser for frame-to-frame boxes. Fast, runs on-device, no network in the hot path.
- **Identity, when needed:** Claude vision on a cropped frame to go from "that's a `laptop`" to a specific product. Async, off the frame-rate path, and only when the class alone isn't enough. Note Claude returns identity reliably but *not* pixel-accurate box coordinates — boxes come from the local model, identity from Claude. Don't invert this.
- **Overlay rendering:** `<canvas>` layered over the `<video>`, redrawn each frame; tap hit-testing against the current box list opens the detail panel.
- **Matching to product data:** detected class + crop → product data layer (same one Part 1 uses) for price, reviews, price match.
- **Purchase-history cross-check:** matched product looked up against synced transactions; already-bought items render dimmed.

---

## Shared Backend / AI Components

- **Budget & list store** — budgets, lists, and progress against them.
- **Product data layer** — pricing, specs, and reviews for the demo catalog.
- **Transaction sync & matching** — reads card transactions via the Rho API, attributes them to budgets, updates spent vs. remaining.
- **AI agent layer**:
  - Budget realism assessment (list + pricing + actual spend)
  - Ask More research agent (product-scoped Q&A)
  - Alternative suggestion engine
  - Transaction-to-budget attribution, with item-level confirmation surfaced to the user
- **Item recognition** (Part 2) — local detection for boxes, Claude vision for identity.
- **Catalog match engine ("Mushroom Body")** — fast shortlisting between a query item and the catalog, used by both parts.

---

## Catalog Match Engine ("Mushroom Body")

**Purpose:** narrow "what is this item / what's a good match or alternative" down to a short candidate list, before handing that list to Claude for the actual judgment call.

**Technique — FlyHash:** modeled on the fruit fly olfactory circuit (the mushroom body / Kenyon cells), a real published approach to locality-sensitive hashing (Dasgupta, Stevens & Navlakha, *Science*, 2017):
1. Take a feature vector for the item (a text embedding of title/description).
2. Project it through a large, sparse random projection — each output dimension sees only a small random subset of input dimensions, as the fly's ~2000 Kenyon cells do with ~50 random projections each.
3. Keep only the top-k winner dimensions (winner-take-all), producing a small sparse binary code.
4. Compare codes by overlap / Hamming distance. That's the entire search.

**What ships, and what's honest about it.** At our catalog size (hundreds of items, not millions), brute-force cosine similarity is already microseconds and has strictly better recall than any LSH scheme — FlyHash buys nothing at this scale, and the "no model inference" framing is misleading anyway, since the query still needs an embedding and *that* is the real latency cost, not the hash.

So: **cosine is the live path. FlyHash ships alongside it as a runnable side-by-side** — same query, both retrievers, showing the codes and the overlap. It's ~30 lines, it's a genuinely good story, and it's real. It is not on the critical path and nothing blocks on it.

Image→catalog matching is **out of scope** — it needs CLIP or equivalent, which is a whole extra dependency. Text-side only.

---

## Tech Stack

### Frontend — one app, two views

**Decision: no Chrome extension.** A Manifest V3 build means a separate manifest, Vite extension config, service worker messaging, content script injection, storage sync, and a separate deploy — all to deliver features a web page delivers identically. Part 2 has to be a mobile web page regardless. One responsive web app covers both, cuts a large slice of the work, and loses nothing that matters for the demo.

- **Framework:** React + TypeScript, bundled with Vite.
- **Layout:** responsive — desktop is the budget/list surface (Part 1), mobile is that plus the camera view (Part 2).
- **Detection:** TensorFlow.js `coco-ssd`, kept off the main thread's critical path.
- **Overlay:** `<canvas>` over `<video>`.

### Backend / API
- **Runtime:** Node.js + TypeScript, Express or Fastify — simple REST.
- **Hosting:** whatever stands up fastest (Vercel / Render / Fly.io). Needs to be HTTPS and reachable from a phone on day one.

### AI Layer

**Claude API (`claude-opus-5`)** for the reasoning-heavy pieces. This is the *cheapest* part of the plan to build — five small prompts, not five systems:

| Feature | Shape |
|---|---|
| Budget realism | one call, `output_config: {format: ...}` for guaranteed-shape JSON |
| Alternatives | one call, structured output |
| Transaction → budget attribution | one call, structured output |
| Ask More | `web_search_20260209` server tool does the research; no scraping to build |
| Item identity from a crop | vision input on the cropped frame |

Use structured outputs everywhere JSON is consumed — don't parse prose.

### Data
- **Database:** Postgres via Supabase. **Do not build auth** — hardcode a demo user. Auth is a classic hackathon time sink with zero demo value.
- **Product/review data:** a **curated JSON catalog** scoped to the ~12 demo items above, seeded by hand. Retailer scraping is blocked and ToS-hostile; SerpApi/Rainforest mean signup, cost, and rate limits for data we can just write down. Live research comes from Claude's web search tool in Ask More, where it's actually qualitative. Be upfront with judges that the catalog is seeded — it's the right call, not a shortcut to hide.

### Transactions

Two implementations of `TransactionSource` (see Part 1 §6). Rho's schema is the contract both conform to.

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

Pick the source with one env var (`TRANSACTION_SOURCE=rho|mock`). Default to `mock` in development so nobody is blocked by network or conference wifi, and have the Rho path working and demonstrable.

### Dev/Deploy
- **Version control:** Git/GitHub (this repo).
- **Packages:** npm/pnpm workspaces if frontend and backend live in one monorepo.

---

## Brand: Fruit Fly Vocabulary

*Drosophila melanogaster* is one of the most studied nervous systems in neuroscience — a tiny brain with extremely fast, well-characterized reflexes. We use it as both a real technical inspiration (the Mushroom Body matcher is a real fly-brain algorithm) and a naming convention, so the theme is more than skin-deep without adding risk where quality or latency actually matter:

| Codename | Real fly anatomy | Maps to |
|---|---|---|
| **Compound Eye** | Wide-field, fast-motion-detecting vision | The live AR camera detection view |
| **Mushroom Body** | Kenyon cells — sparse coding / associative matching | The FlyHash catalog matcher (a genuine biological algorithm, not just a name) |
| **Halteres** | Balance organs used for flight stability | Budget realism / balance check |
| **Proboscis** | Feeding tube used to sample and taste | The "Ask More" research agent |
| **Metabolism** | Consumption and energy use | Transaction sync — what's actually been spent, via the Rho API |

Only Compound Eye and Mushroom Body map to real technical components; the rest is naming layered on features already planned above. None of it sits between a user and the reasoning that needs to be fast and correct.

---

## Build Order

The Rho integration is what's being judged at a Rho hackathon, so it doesn't go last. Detection still gets spiked first because it's the only piece that can fail outright — but on a hard timebox, with a known fallback.

1. **Camera → box spike. 2-hour timebox.** `coco-ssd` boxing a laptop and a chair over live video on a real phone, over HTTPS. Validates the demo item set and the whole AR premise. If it doesn't hold in two hours, fall back to periodic backend vision calls with held/interpolated boxes — and if *that* doesn't hold, Part 2 is cut and the plan is still a complete product.
2. **Transaction sync + budget core.** Write `MockSource` first — it's a JSON file and a poll loop, and it unblocks everyone immediately with no network dependency. Then budget/list data model, transaction → budget attribution, item confirmation UI. This is the spine. `RhoSource` slots in behind the same interface whenever someone has an hour; it's a small job precisely because the interface came first.
3. **AI layer.** Realism check, alternatives, Ask More. Five prompts, structured outputs.
4. **Compound Eye.** Wire the proven detection loop to the product data layer — box → tap → detail panel, with already-bought state from step 2.
5. **Stretch, in order:** receipt line-item extraction, FlyHash side-by-side, price match.

---

## Scope Decisions Already Made

Recorded so they don't get relitigated mid-build:

| Decision | Why |
|---|---|
| Business procurement, not consumer shopping | Matches the sponsor's actual customer. (This holds on its own merits — mocking the data doesn't reopen it.) |
| Transactions behind a `TransactionSource` interface, mock + Rho | Mock unblocks dev and enables a live inject on demo day; Rho keeps the real sponsor integration. Not either/or |
| One responsive web app; no Chrome extension | MV3 is pure overhead for features a web page delivers identically |
| Demo items are COCO classes | Turns the riskiest component into the most reliable one, for free |
| Transactions attribute to budgets; items are user-confirmed | Card data has no line items — item-level inference would guess wrong most of the time |
| Curated JSON catalog | Scraping is blocked; product APIs cost time and money for data we can write down |
| No auth — hardcoded demo user | Classic time sink, zero demo value |
| Cosine ships live; FlyHash ships as a side-by-side | Cosine is better at our scale; FlyHash is a real story, not a critical path |
| No image embeddings / CLIP | Whole extra dependency for marginal gain |

---

## Open Questions

- **How long is the hackathon, and how many of us are there?** Everything above assumes the scope cuts are sufficient. If it's a short event or a small team, Part 2 gets cut and Part 1 becomes the whole product — which is a complete, coherent demo on its own.
- What's the actual demo shelf — do we have real versions of the COCO-class items on hand to point a camera at, or do we need to source them?
- Which source do we demo on? `MockSource` gives a clean live inject and on-catalog merchants; `RhoSource` is the real sponsor integration. Showing the Rho path working and *then* injecting through the mock gets both, if it doesn't feel like a dodge.
- Do we author an itemized receipt PDF for the mock to demo line-item extraction, or leave that as a stretch and show budget-level attribution only?
- Single budget owner, or shared/team budgets with multiple people spending against one?
- How far does price match go — real comparison data, or seeded alongside the catalog?
