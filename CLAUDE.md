# On the Fly — Project Guide

**Click REBID on what your business already pays for.**

The current hackathon target is fictional GovCon Industries: Stripe sandbox connection plus a separately labeled synthetic buyer ledger, one DevSecOps REBID workflow, real public supplier evidence, modeled pricing, actual Fly Scout exploration, and a submitted challenge.

Read [the current plan](plan/plan1.md) and [current roadmap](roadmap/README.md) for scope and status. Follow [.claude/codingrules.md](.claude/codingrules.md) for structure and implementation conventions. The supplied build plan informed these documents; its example numbers and aspirational claims are not evidence of implemented features.

## Current implementation

React/Vite, FastAPI, SQLAlchemy, SQLite, and Alembic are implemented. Keep the existing feature/service/API/model layout.

Stripe transaction-only sandbox consent, company binding, paginated imports, updates, polling and UI exist. The latest verification (2026-09-12) reported 313 backend tests passing and a successful frontend build; Stripe HTTP calls were mocked. Real sandbox consent is still unverified.

Fixtures, recurring-expense grouping, publishing/preview, profiles, challenges and comparison exist for a commercial-cleaning scenario. Reuse them and adapt the scope fields to DevSecOps. GovCon fixtures, REBID orchestration, USAspending discovery, public-rate pricing, Tavily enrichment, OpenAI reasoning and Fly Scout are not implemented.

On `feat/task-market-ui`: a Kalshi-style "task market" UI with light/dark/system themes (roadmap 11, "Task market direction") and owner-approved supplier invitations (roadmap 08): fixture or Tavily discovery, a preview-hash approval gate, an idempotent queue to a sandbox outbox by default (SMTP only behind an allowlist), and a public opt-out page. Tavily and SMTP have only been exercised with mocks.

## Scope and stack decisions

- **P0:** verify Stripe, add GovCon fixtures, build REBID and confirmed scope, discover actual USAspending suppliers, show defensible public-rate modeled savings.
- **P1:** Tavily enrichment, actual Fly Scout output, two-device challenge flow and modern UI/demo rehearsal.
- **P2:** autonomous tool selection, fly learning, more categories, production auth and hosting expansion.
- **Database:** SQLite currently. Supabase/Postgres is a later deployment option, not an active integration.
- **AI:** OpenAI is planned for scope/evidence processing. Anthropic dependency/configuration remain in code; neither implies a completed reasoning flow.
- **Financial data:** Stripe sandbox plus fixtures through the existing normalized pipeline. Rho is out of the hackathon.
- **Notifications:** excluded. Use manual refresh/polling for the buyer challenge view.
- **Outreach:** owner-approved invitations only, sandbox outbox by default; no automatic sending ever. Manual listing sharing remains sufficient for the demo.
- **Fly Scout:** now in scope for P1; only chooses exploration among already-qualified suppliers. Do not claim a biological connectome or neuron count until runtime/model evidence supports it.
- **Genuine quote:** optional bonus, not a blocking requirement.
- **UI:** a Kalshi-style task market (market board, market page with a bid ticket, token-swap dark mode); Spend → Progress → Market → Fly → Bid with REBID as the primary action.

## Data and workflow boundaries

Stripe sandbox data is labeled `sandbox`; the GovCon ledger stays `fixture` and displays **Hackathon demo ledger — synthetic buyer spend based on public procurement categories**. Never claim those custom transactions came from Stripe.

Public-rate results display **Modeled bid from public pricing — not a vendor quote** and are separate from submitted challenges. A teammate's live demo submission is a demo offer, not automatically a genuine commercial quote.

REBID starts private research. It does not bypass confirmation of contract scope, the exact public preview, or owner approval to publish. Scope, staffing/hours, rate assumptions and provenance must support comparable pricing.

## Repo layout

- `frontend/src/features/`: dashboard, connections, publishing, marketplace, profile, challenge and inbox UI.
- `backend/app/`: API, services, models, database and core conventions.
- `backend/alembic/`: schema migrations.
- `plan/plan1.md`: current product plan; `previous-marketplace-plan.md` is historical.
- `roadmap/README.md`: current P0/P1/P2 order; numbered files retain earlier component specifications.
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

- **Open bidding is a per-listing toggle, default off.** Sealed by default: the public listing shows only an offer count. When the owner turns it on, offer prices and scope become public and challengers can underbid. A listing whose mode is unset, ambiguous, or errored is sealed.
- **Challenger identities are never visible to other challengers, in either mode.** Prices go public in open bidding; who offered them does not. Cross-listing price surveillance is a real commercial harm and the fastest way to make providers stop participating. The owner always sees identities.
- **A mode change never applies retroactively.** An offer submitted while bidding was sealed stays sealed even if the owner later opens it. The challenger may opt in to publish theirs; otherwise it stays private and still counts. Record the mode in force on the offer itself, not just on the listing.
- **The mode is shown on the listing and in the challenge form before submission.** A challenger must never discover after the fact that their price became public.
- **A public leaderboard shows scope completeness beside price, never price alone.** Ranking on bare price teaches challengers that the way to win is to quietly offer less.
- **An owner cannot bid on their own listing.**
- **Challengers may revise their own offers until the deadline; revision history is retained.** Submissions after the deadline are rejected with a clear message, never silently accepted.
- **Scope is versioned, and offers attach to the version they answered.** Editing scope never retroactively reframes an existing offer.
- **One account type.** The same business publishes its own expenses and challenges others'. Don't build a buyer/vendor role split.

### Outbound (secondary path)

- **Nothing sends without explicit owner approval of recipients and message contents.** Editing a plan, seeding data, or running a job does not authorize outreach.
- **Invitations are idempotent.** Reprocessing a queue never sends a duplicate.
- Commercial email needs accurate headers, a physical postal address, and a working opt-out — properties of the template, not of the approval step.
- **An invited challenger lands on the same public listing as everyone else.** No token-scoped private flow, no parallel universe.

### Scope discipline

- **One complete DevSecOps REBID path, one fictional GovCon buyer, Stripe sandbox plus synthetic fixtures.** Other seeded categories are spend-view context only.
- **No authentication work.** Seeded accounts and a switcher. Every hour spent on signup is an hour not spent on the loop.
- The demo ends at a shortlisted challenger. Contracts, payment routing, and service delivery are out of scope.
- Listing states: `private → scope confirmed → public → closed → shortlisted`. Unpublishing returns to private and retains received challenges.

## Main entities

| Entity | Purpose |
|---|---|
| Account / BusinessProfile | Platform identity and public presence |
| Connection / Transaction | Source account and original spend evidence |
| Vendor / ServiceExpense | Normalized payee and recurring service baseline |
| Visibility | Per-expense public/private state, disclosure options, audit trail |
| Listing / ScopeVersion | The public projection, its versioned scope, its bidding mode |
| Challenge / ChallengeRevision | A counteroffer, conditions, provenance, revisions, and the bidding mode in force at submission |
| ChallengerEvidence | Source-backed checks and identity-match status |
| Invitation | Secondary path: provider, approved message, delivery state |
| Comparison | Normalized costs, scope differences, savings assumptions |

## Open questions

Current questions are tracked in [roadmap/README.md](roadmap/README.md): exact GovCon seed arithmetic, useful public supplier/rate data, actual Fly Scout runtime, and two-device demo hosting. A genuine supplier quote is optional.
