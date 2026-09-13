# OnTheFly

Product: connect existing business spend → REBID → find credible alternative suppliers → compare modeled pricing → receive a challenger bid.

## Source of truth

- `roadmap/README.md` — current priorities and build order.
- `plan/plan1.md` — product and demo definition.
- `CLAUDE.md` — detailed product constraints; read only when relevant.
- `.claude/codingrules.md` — implementation conventions; read only when relevant.

Do not load every document for every task. Inspect only the relevant code and documentation.

## Working rules

- Work only on the explicitly assigned task.
- Inspect existing implementation before editing; code may be newer than roadmap checkboxes.
- Prefer the smallest complete patch.
- Reuse existing models, services, routes, adapters, and components.
- Do not refactor unrelated code.
- Do not add dependencies unless explicitly approved.
- Never read, modify, print, or expose `.env` files or secrets.
- Do not commit, push, merge, rebase, reset, checkout, stash, or run `git clean` unless explicitly asked.
- Run targeted tests for changed behavior.
- Do not independently start another roadmap item.
- Keep responses concise.
- If blocked by credentials, external access, or a product decision, stop instead of guessing.

## Product invariants

- GovCon buyer spend is synthetic demo data and stays clearly labeled.
- Stripe data and synthetic fixtures are separate sources.
- Public pricing estimates are not vendor quotes.
- Money, savings, eligibility, and supplier identity matching remain deterministic.
- REBID begins private research; it does not automatically publish spend.
- Fly Scout explores already-qualified suppliers; it does not determine identity or calculate price.

## Demo path

Spend → REBID → confirmed DevSecOps scope → real suppliers → modeled public pricing → Fly Scout → submitted challenge.

Prioritize completing this path over unrelated polish.