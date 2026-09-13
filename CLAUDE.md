# On the Fly — Project Guide

**REBID what your business already pays for, post what it newly needs, and split off the pieces that save money.**

On the Fly is a task market. The current hackathon target is fictional GovCon Industries:
- a Stripe sandbox connection plus a separately labeled synthetic buyer ledger
- a DevSecOps REBID
- acceptance of an offer, which moves task ownership to the winning bidder
- deterministic "Ways to save" splits into pieces that other businesses bid on and then own in turn
- real public contract and labor-rate evidence behind every modeled figure

Read [the current plan](plan/plan2.md) and [current roadmap](roadmap/README.md) for scope and status. [Roadmap 12](roadmap/12-task-ownership-and-splitting.md) is the build specification for task ownership and splitting. [Plan1](plan/plan1.md) is retained for REBID detail (GovCon ledger, scope inputs, supplier discovery, public-rate rules); where it differs from plan2 on priority or demo, plan2 wins.

Follow [.claude/codingrules.md](.claude/codingrules.md) for structure and implementation conventions. The supplied build plan informed these documents; its example numbers and aspirational claims are not evidence of implemented features.

## Current implementation

React/Vite, FastAPI, SQLAlchemy, SQLite, and Alembic are implemented. Keep the existing feature/service/API/model layout.

Stripe transaction-only sandbox consent, company binding, paginated imports, updates, polling and UI exist. The latest verification (2026-09-12) reported 313 backend tests passing and a successful frontend build; Stripe HTTP calls were mocked. Real sandbox consent is still unverified.

Fixtures, recurring-expense grouping, publishing/preview, profiles, challenges and comparison exist for a commercial-cleaning scenario. Reuse them; scope moves onto requirement rows and category templates (roadmap 12, step 2) rather than new DevSecOps columns.

Not implemented:
- GovCon fixtures, REBID orchestration, USAspending discovery, public-rate pricing, Tavily enrichment, OpenAI reasoning and Fly Scout.
- Tasks with a poster and task owner, offer acceptance, requirements, `new` tasks, splits and cuts, cost basis rates, market evidence, Ways to save and money views.

Also implemented (merged 2026-09-13): a Kalshi-style "task market" UI with light/dark/system themes (roadmap 11, "Task market direction") and owner-approved supplier invitations (roadmap 08): fixture or Tavily discovery, a preview-hash approval gate, an idempotent queue to a sandbox outbox by default (SMTP only behind an allowlist), and a public opt-out page. Tavily and SMTP have only been exercised with mocks. The latest verification (2026-09-13) reported 360 backend tests passing and a successful frontend build with the colour and contrast checks.

## Scope and stack decisions

- **P0, the splitting path:**
  - Prerequisites: verify Stripe, add GovCon fixtures, build REBID with confirmed requirements, discover actual USAspending suppliers, and integrate one public labor-rate path.
  - Then roadmap 12 steps 1–10: tasks with poster and task owner, acceptance, requirements, `new` tasks, cuts and manual splits, piece visibility, cost basis rates, market evidence, Ways to save, and money views.
- **P1:**
  - Split everything (LLM) and LLM scope drafting for new tasks
  - Tavily enrichment
  - Fly Scout and FlyHash ranking, after splitting
  - Screens for My work, the split drawer and Ways to save, plus roadmap 11's open accessibility and honesty-label audit
  - Three-device rehearsal
- **P2:** splitting before bidding (teaming), period conversion between a task and its pieces, autonomous tool selection, fly learning, more categories, production auth and hosting expansion.
- **Database:** SQLite currently. Supabase/Postgres is a later deployment option, not an active integration.
- **AI:** OpenAI is planned for requirement tags, hour estimates, split drafts and evidence summaries, never money, identity or acceptance. Anthropic dependency/configuration remain in code; neither implies a completed reasoning flow.
- **Financial data:** Stripe sandbox plus fixtures through the existing normalized pipeline. Rho is out of the hackathon.
- **Notifications:** excluded. Use manual refresh/polling for the buyer challenge view.
- **Outreach:** owner-approved invitations only, sandbox outbox by default; no automatic sending ever. Manual listing sharing remains sufficient for the demo.
- **Fly Scout:** P1, after the splitting path. It only chooses exploration among already-qualified suppliers for a published task or piece. Every fly-influenced result is labeled where it appears. Do not claim a biological connectome or neuron count until runtime/model evidence supports it.
- **Genuine quote:** optional bonus, not a blocking requirement.
- **UI:** a Kalshi-style task market (market board, market page with a bid ticket, token-swap dark mode).
  - Navigation is Markets · Spend · My listings, with My work planned for tasks an account owns through acceptance.
  - REBID's Progress → Market → Bid steps live inside the expense's REBID page.
  - Ways to save is the primary action on a task the acting account owns.

## Data and workflow boundaries

Stripe sandbox data is labeled `sandbox`; the GovCon ledger stays `fixture` and displays **Hackathon demo ledger — synthetic buyer spend based on public procurement categories**. Never claim those custom transactions came from Stripe.

Public-rate results display **Modeled bid from public pricing — not a vendor quote** and are separate from submitted challenges. Ways to save cards display **Modeled cut from public pricing — not an offer**. A teammate's live demo submission is a demo offer, not automatically a genuine commercial quote.

Cost basis rates (a buyer's current contract rates, a task owner's internal costs) are owner-entered or fixture data, labeled as such, and never public.

REBID starts private research. It does not bypass confirmation of contract scope, the exact public preview, or owner approval to publish. Scope, staffing/hours, rate assumptions and provenance must support comparable pricing.

## Repo layout

- `frontend/src/features/`: Spend (`dashboard`), connections, publish, marketplace, My listings (`listings`), invitations, profile, challenge, Offers (`inbox`) and trace UI.
- `frontend/src/shared/`: UI primitives (`ui`), `MarketCard` (`market`), fly badges (`flybrain`), theme and formatting.
- `frontend/src/app/shell/`: app shell and navigation.
- `backend/app/`: API, services, models, database and core conventions.
- `backend/alembic/`: schema migrations (0001–0012 exist; new ones start at 0013).
- `plan/plan2.md`: current product plan. `plan1.md` is retained for REBID detail; `previous-marketplace-plan.md` is historical.
- `roadmap/README.md`: current P0/P1/P2 order. `12-task-ownership-and-splitting.md` is the active build spec; the other numbered files retain component specifications.
- `.claude/codingrules.md`: coding structure rules.

## Working conventions

These rules exist because breaking them makes the product dishonest or unsafe, not just buggy.

### Visibility — the highest-stakes rule in the codebase

Publishing a business's spend is irreversible in practice: once seen, it's seen. Accidental disclosure is this product's worst failure mode.

- **Private is the default and the fallback.** Every expense imports private. An expense whose visibility state is ambiguous, unset, or errored is private. There is no code path where the safe state requires a successful computation.
- **Publishing is explicit, per-expense, and owner-initiated.** Never a side effect of import, categorization, scope drafting, or any background job. No bulk publish without a confirmation that lists every affected item.
- **The public projection is constructed explicitly, field by field.** Never derive a public view by filtering or omitting fields from the private record. A serializer that starts from the rich object and removes fields will leak the next field someone adds — build the public shape as its own model.
- **The owner previews the exact public payload before publishing,** and can unpublish instantly at any time.
- **Never public:** raw transaction history, account or connection details, other expenses, challenger identities, exact street address unless explicitly opted in. Offer amounts are public only when the listing's open-bidding toggle is on.
- **The incumbent vendor's name is a separate opt-in, hidden by default.** Publishing it discloses a third party's pricing, which may be contractually restricted. Warn at publish time.
- Every visibility change is audited: who, what, when, and what the public payload was at that moment.

### Evidence and claims

- **An unavailable source means "not checked."** A search returning nothing means "no match found in this source." Neither renders as "verified," "clean," or "proven safe."
- **Adverse records require an identifier-level match.** Name plus city never attaches an exclusion, violation, or regulatory record to a business. At lower confidence, report that a possible match needs review — never the record's contents.
- **Never let a model establish identity.** Entity matching is deterministic, with identifiers. A model may summarize a finding; it may not decide two businesses are the same.
- **Every check records** source, timestamp, match confidence, result, and limitations. No source, no display.
- **No blanket "verified" badge** when only some facts were checked. Rollups name which sources they cover.
- Unimplemented or unavailable checks are listed as not run, never omitted — hiding them makes the completed ones look comprehensive.
- **Show data provenance everywhere:** `production | sandbox | imported | fixture` for financial data; `challenger-submitted | captured from an off-platform response | demo data` for counteroffers.

### Money and math

- **Monetary calculations are deterministic code, never model output.** Same for deduplication, deadlines, visibility state, and offer versioning.
- **Amounts are integer minor units** with an explicit currency. No floats for money. Currencies stay separate absent an explicit conversion basis.
- **Exclude transfers, payroll, and taxes** from eligible spend; reconcile reversals and refunds. These are never publishable.
- **Normalize offers to a common period before comparing, and surface scope gaps before price.** A cheaper offer covering two visits against a three-visit scope is not cheaper; ranking it first is the product lying.
- Unknown material costs make a comparison **provisional**, with assumptions shown.
- Savings are **potential** until a switch happens. That word belongs in the UI.

### AI boundaries

- **The model drafts scope from transaction evidence plus owner-provided detail. It never invents details from a merchant name.** Unknown fields stay explicit unanswered questions. A field can be explicitly unanswered, which is different from empty.
- **An AI estimate is never a counteroffer.** An extracted offer retains a reference to its original evidence.
- **Transactions reveal payment patterns, not contract terms.** Vendor, category, and eligibility are owner-correctable, and corrections persist across imports.

### Marketplace mechanics

In these rules, **owner** means the account that posted the listing (its poster). **Task owner** means the account currently responsible for the work; see "Task ownership and splitting".

- **Open bidding is a per-listing toggle, default off.** Sealed by default: the public listing shows only an offer count. When the owner turns it on, offer prices and scope become public and challengers can underbid. A listing whose mode is unset, ambiguous, or errored is sealed.
- **Challenger identities are never visible to other challengers, in either mode.** Prices go public in open bidding; who offered them does not. Cross-listing price surveillance is a real commercial harm and the fastest way to make providers stop participating. The owner always sees identities.
- **A mode change never applies retroactively.** An offer submitted while bidding was sealed stays sealed even if the owner later opens it. The challenger may opt in to publish theirs; otherwise it stays private and still counts. Record the mode in force on the offer itself, not just on the listing.
- **The mode is shown on the listing and in the challenge form before submission.** A challenger must never discover after the fact that their price became public.
- **A public leaderboard shows scope completeness beside price, never price alone.** Ranking on bare price teaches challengers that the way to win is to quietly offer less.
- **An owner cannot bid on their own listing.**
- **Challengers may revise their own offers until the deadline; revision history is retained.** Submissions after the deadline, or after an offer has been accepted, are rejected with a clear message, never silently accepted.
- **Scope is versioned, and offers attach to the version they answered.** Editing scope never retroactively reframes an existing offer.
- **One account type.** The same business publishes its own expenses and challenges others'. Poster and task owner are per-task relationships, not account types. Don't build a buyer/vendor role split.

### Task ownership and splitting

- **Only the current task owner can split a task.** The poster owns a task until it accepts an offer. Acceptance transfers ownership to that offer's bidder, and the previous owner can no longer split it. The same holds for every piece at any depth.
- **Acceptance is a marketplace record, not a contract.** The accepted scope is the version the accepted offer answered. Acceptance and every ownership transfer are audited.
- **Splitting never publishes.** Every piece starts private and goes through confirmation, exact preview, and approval.
- **Every requirement stays with the task or goes to exactly one active piece.** Accepting an offer that would double-cover a requirement is blocked.
- **Cuts are deterministic money.** Integer minor units in the task's currency and period. Total cuts never exceed the starting price, and no acceptance may make a task owner's remainder negative.
- **Nothing upstream appears in a piece's public projection.** The parent task, its poster, its accepted price, rates, remainder and savings cards are never public on a piece. Build the piece projection as its own model.
- **Each account sees only its direct counterparties:** the poster of tasks it owns, and the bidders on tasks it posted. A client sees nothing about pieces its task owner splits off, and those bidders never see the client.
- **No account in a piece's payer chain can bid on it.** The chain is the piece's poster, plus the parent's payer chain when the poster owns the parent through an accepted offer.
- **Constraints flow down.** Clearance, location, insurance and set-aside requirements carry into a piece by default; removing one is audited.
- **Suggestions need the owner's own rates.** The model may draft tags and hours. Code computes keep cost, cut, savings, thresholds and tiers. Thresholds come from config, are shown on every card, and are never tuned to force a result.
- **Pricing evidence is public data only.** Never use offers from any listing, sealed or open, individually or in aggregate.
- **Every fly-influenced result is labeled where it appears,** with its role in plain words, and is never styled as a verdict, score or status.

### Outbound (secondary path)

- **Nothing sends without explicit owner approval of recipients and message contents.** Editing a plan, seeding data, or running a job does not authorize outreach.
- **Invitations are idempotent.** Reprocessing a queue never sends a duplicate.
- Commercial email needs accurate headers, a physical postal address, and a working opt-out — properties of the template, not of the approval step.
- **An invited challenger lands on the same public listing as everyone else.** No token-scoped private flow, no parallel universe.

### Scope discipline

- **One DevSecOps task chain:** one fictional GovCon buyer, two demo bidders (Prime A, Sub B), Stripe sandbox plus synthetic fixtures. Other seeded categories are spend-view context only.
- **No authentication work.** Seeded accounts and a switcher. Every hour spent on signup is an hour not spent on the loop.
- The demo ends at accepted pieces and reconciled money views. Contracts, payment routing, and service delivery are out of scope.
- Listing states: `private → scope confirmed → public → closed → shortlisted → accepted`. Accepting closes bidding and transfers task ownership. Unpublishing returns to private and retains received challenges.

## Main entities

| Entity | Purpose |
|---|---|
| Account / BusinessProfile | Platform identity and public presence |
| Connection / Transaction | Source account and original spend evidence |
| Vendor / ServiceExpense | Normalized payee and recurring service baseline |
| Visibility | Per-expense public/private state, disclosure options, audit trail |
| Task *(planned)* | Origin (`rebid \| new \| split`), poster, task owner, lifecycle, accepted offer |
| Listing / ScopeVersion | A task's public projection, its versioned scope, its bidding mode |
| Requirement *(planned)* | Versioned requirement rows with tags, hours, source and flowed-down constraints |
| Challenge / ChallengeRevision | A counteroffer, conditions, provenance, revisions, the bidding mode in force at submission, and per-requirement responses *(planned)* |
| TaskSplit *(planned)* | A piece split off a task: cut, assigned requirements, entry point, undo |
| CostBasisRate *(planned)* | Private contract or internal labor rates used for keep cost |
| MarketEvidence *(planned)* | Public award, subaward and labor-rate retrievals with status and limitations |
| SavingsCard *(planned)* | A segment's keep cost, modeled cut, savings, thresholds, tier and status |
| SplitPlan *(planned)* | An LLM split-everything draft with model and prompt provenance |
| ChallengerEvidence | Source-backed checks and identity-match status |
| Invitation | Secondary path: provider, approved message, delivery state |
| Comparison | Normalized costs, scope differences, savings assumptions |

## Open questions

Open questions are at the top of [roadmap/README.md](roadmap/README.md), "Open questions to answer before building". Don't start P0 implementation until each has a recorded answer. Questions 6 (Fly Scout runtime) and 7 (three-device hosting) block only P1. Don't answer them on the user's behalf; a proposal is not an answer. A genuine supplier quote is optional.
