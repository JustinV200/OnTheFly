# Coding Rules — On the Fly

These rules are mandatory for every file created or edited in this repo, frontend or backend. They exist to keep a hackathon-speed codebase navigable under multiple people touching it in parallel: small modules, obvious homes for new code, and comments that explain intent rather than syntax.

## 1. Modular design

- **One responsibility per file.** A file that does two unrelated things gets split, even under time pressure. A component that renders AND fetches AND transforms data becomes three files: the component, a hook, a transform function.
- **No god files.** No `utils.ts`, `helpers.py`, `types.ts` catch-all at the root of a feature. If you're about to add a fourth unrelated function to a shared file, it's time for a subfolder.
- **Depend on interfaces, not implementations.** The `TransactionSource` pattern (interface with `RhoSource`/`MockSource` implementations, selected by env var) is the model to follow anywhere two implementations of the same capability exist or are likely to: the catalog matcher (cosine vs. FlyHash), the AI provider call, the product data layer. Code against the interface; never import a concrete implementation outside of its own module and the composition point that wires it up.
- **Explicit boundaries between layers.** Route/endpoint handlers stay thin — they parse input, call a service function, shape the response. Business logic (budget math, matching, attribution) lives in service modules that don't know about HTTP or React. AI prompt construction lives in its own module per feature, not inlined in a route handler or component.
- **No hidden coupling.** A module reaches another module through its public exports only, never by importing a private/internal file path from outside that module's own folder.

## 2. Subfolder structure

Prefer more, smaller folders over fewer, bigger ones. When a folder passes ~5-7 files, split it into subfolders by concern. Concretely:

### `frontend/src/`

```
frontend/src/
  features/
    budget/
      components/       # BudgetForm, BudgetSummary, etc. — one component per file
      hooks/             # useBudget, useBudgetRealism
      api/                # calls into the backend for this feature only
      types.ts
    list/
      components/
      hooks/
      api/
      types.ts
    ar/                   # Compound Eye — camera + detection view
      components/         # CameraView, BoxOverlay, DetailPanel
      detection/          # coco-ssd wiring, frame loop
      hooks/
      types.ts
    transactions/
      components/
      hooks/
      api/
      types.ts
    ask-more/             # Proboscis — product-scoped research chat
      components/
      hooks/
      api/
  shared/
    components/           # truly cross-feature UI primitives only
    hooks/
    lib/                  # generic, feature-agnostic utilities
    types/
  app/                    # routing, layout shell, providers
```

A component, hook, or type used by exactly one feature lives inside that feature's folder, not in `shared/`. Promote to `shared/` only once a second feature genuinely needs it.

### `backend/app/`

```
backend/app/
  api/
    budget/               # FastAPI router + request/response schemas for this resource
      router.py
      schemas.py
    list/
      router.py
      schemas.py
    transactions/
      router.py
      schemas.py
    ar/
      router.py
      schemas.py
  services/
    budget/                # budget math, realism assessment orchestration
    matching/               # Mushroom Body — cosine.py, flyhash.py, side by side
    transactions/
      source.py              # TransactionSource protocol/interface
      rho_source.py
      mock_source.py
      attribution.py
    ai/
      client.py               # thin Claude API wrapper, nothing feature-specific here
      prompts/                 # one module per prompt: realism.py, alternatives.py, ask_more.py, identity.py
  models/                    # Pydantic/DB models, one file per entity or tight cluster
  db/
    session.py
    migrations/
  core/
    config.py                 # env var loading (TRANSACTION_SOURCE, API keys, etc.)
```

Routers stay thin and call into `services/`. A service module never imports FastAPI. `services/transactions/source.py` defines the interface; `rho_source.py` and `mock_source.py` are the only two files that implement it, and both conform to the same schema in `models/`.

If a feature needs a subfolder structure not shown above, mirror the pattern (group by feature first, then by concern within the feature) rather than inventing a new convention.

## 3. Comments — frequent, and purposeful

Comment generously in this codebase. The bar is different from a mature production codebase: assume the next reader (teammate or judge) is seeing this file for the first time and does not have the plan doc open.

- **Every file** doing non-trivial work starts with a 1-3 line comment stating what it's responsible for and, where relevant, what it deliberately does *not* do (e.g. "Matches transactions to budgets, not to line items — see plan §6 for why item-level matching isn't attempted here.").
- **Every exported function** gets a short comment above it: what it does, what it assumes about its inputs, and anything non-obvious about its return value.
- **Every non-obvious line or block** gets a comment explaining the *why*, not a restatement of the *what*. `// subtract the fly's negative amount to get spend` is noise; `// Rho amounts are negative cents for debits — flip sign before summing against budget.remaining` is useful.
- **Every place two implementations satisfy one interface** (TransactionSource, catalog matchers, AI provider calls) gets a comment at the point of selection explaining which one is active and why (env var, fallback behavior).
- **Every workaround, hack, or deliberate scope cut** gets a comment linking back to the reason — cite the plan section if it's recorded there (e.g. "No line-item matching: card data has no SKU-level detail, see plan/plan1.md §6").
- Comments describe intent and constraints, not syntax. Don't write `// loop over items` above a `for` loop; do write `// items are already sorted by risk from the realism-assessment call, so the first N are the ones to flag`.

This is a deliberate departure from "self-documenting code needs no comments" — on a hackathon team under time pressure, the comment is often the only handoff a teammate gets.

## 4. General strictness

- **Type everything.** TypeScript: no `any` without a comment justifying it. Python: type hints on every function signature; Pydantic models for anything crossing an API boundary.
- **No silent failure.** Catch specific errors, not bare `except:`/blanket `catch {}`. If a transaction source is unreachable, surface that state, don't swallow it.
- **Structured output only.** Any AI call whose result is consumed as data (not shown as free text to a user) uses a structured/JSON output schema. Never regex or string-parse a model's prose response.
- **Config through env vars, not hardcoded branches.** `TRANSACTION_SOURCE`, API keys, and similar live in one config module (`core/config.py` / a frontend `.env`), read once, and get threaded through as values — not re-read or re-branched-on ad hoc across the codebase.
- **New file → new folder decision.** Before adding a file, decide which feature folder it belongs to and whether that folder needs a subfolder split first. Don't default to dropping a file at the nearest existing top level.
