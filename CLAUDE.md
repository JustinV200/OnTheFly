# On the Fly — Project Guide

Procurement assistant for a Rho hackathon. A team lead sets a budget, builds an equipment list, and gets AI-backed purchase guidance against real card spend — as a web app, extended with a live AR camera view for buying in a physical store.

Full product spec, feature breakdown, and scope decisions: [plan/plan1.md](plan/plan1.md). Read it before making feature or scope calls — it records *why* decisions were made so they don't get relitigated.

Coding rules for this repo (modular design, subfolder layout, commenting standard): [.claude/codingrules.md](.claude/codingrules.md). Follow it for every file you create or edit here.

## Status

Planning → early build. No application code exists yet; `frontend/` and `backend/` get created as work starts.

## Tech stack

- **Frontend:** React + TypeScript, bundled with Vite. One responsive app — desktop is the budget/list surface, mobile adds the camera (AR) view. No Chrome extension (see plan for why).
- **Backend:** Python + FastAPI. Async REST, Pydantic models for request/response shapes.
- **AI:** Claude API (`claude-opus-5`) for every reasoning step — budget realism, alternatives, transaction attribution, item identity from a camera crop, and the "Ask More" research agent (via the `web_search_20260209` server tool). Use structured outputs everywhere JSON is consumed; never parse prose.
- **Detection (AR):** TensorFlow.js `coco-ssd` in-browser for live bounding boxes. Demo item set is deliberately COCO classes (laptop, keyboard, mouse, tv, chair, backpack, book, clock, bottle, cup, potted plant, scissors) so detection needs no custom model.
- **Data:** Postgres via Supabase. No auth — hardcoded demo user. Product/review catalog is a curated JSON file scoped to the demo items, not scraped or pulled from a paid API.
- **Transactions:** a `TransactionSource` interface with two implementations sharing one schema — `RhoSource` (live Rho sandbox API) and `MockSource` (seeded fixture + inject endpoint for a live demo moment). Selected by `TRANSACTION_SOURCE=rho|mock`, default `mock`.

## Repo layout

- `frontend/` — React + TS app (Vite).
- `backend/` — FastAPI app.
- `plan/` — design docs. `plan1.md` is the current plan of record.
- `assets/` — brand/mascot assets.
- `.claude/` — Claude Code project configuration and coding rules.

Within `frontend/` and `backend/`, follow the subfolder structure and module boundaries in [.claude/codingrules.md](.claude/codingrules.md) — features and components each get their own directory rather than being lumped into shared catch-all files.

## Working conventions

- Card transaction data has **no line items** — matching works at the budget level; item attribution is a user action (checkbox), never an inference. Don't build features that assume per-item transaction data exists.
- Boxes on the AR view come from the local `coco-ssd` model; product *identity* comes from Claude vision on a crop. Don't invert this — Claude's box coordinates are not pixel-accurate.
- The product catalog is intentionally small and hand-seeded (~12 items). Don't add scraping or a paid product-data API.
- Cosine similarity is the live catalog-matching path. FlyHash (`Mushroom Body`) is a side-by-side demo of a real fly-brain algorithm, not on the critical path — don't make anything depend on it.
- Fruit-fly names (`Compound Eye`, `Mushroom Body`, `Halteres`, `Proboscis`, `Metabolism`) are branding layered onto specific features — see the plan's naming table before introducing a new one.
