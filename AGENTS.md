# OnTheFly

Product: a task market. REBID existing spend or post new work → accept an offer, which moves task ownership to the winning bidder → the task owner splits off pieces where public contract and rate evidence says that saves money → each piece is bid on and owned in turn.

## Source of truth

- `roadmap/README.md` — current priorities, build order, and open questions to answer before building.
- `plan/plan2.md` — product and demo definition. `plan/plan1.md` is retained for REBID detail.
- `roadmap/12-task-ownership-and-splitting.md` — build steps for task ownership and splitting.
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
- Fly Scout explores already-qualified suppliers; it does not determine identity or calculate price. It comes after splitting, and every fly-influenced result is labeled where it appears.
- Only the current task owner can split a task. Splitting never publishes, and nothing upstream (parent task, its poster, accepted price, rates) appears in a piece's public projection.
- Cuts, remainders and Ways to save figures are deterministic integer minor units. Pricing evidence is public data only, never offers from any listing.

## Demo path

GovCon Spend → REBID with confirmed DevSecOps requirements → Prime A's offer accepted, ownership transfers → Ways to save from real public evidence → piece split off and published → Sub B's offer accepted → Sub B can split → money views reconcile. Fly Scout follows splitting.

Prioritize completing this path over unrelated polish.