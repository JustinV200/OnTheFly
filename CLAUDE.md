# On the Fly — Project Guide

A B2B marketplace built on voluntary price transparency. A business connects its financial account, sees every expense in a private dashboard, and toggles individual expenses public. Public expenses appear on the business's profile, where any other business on the platform can see them and post a counteroffer.

Core interaction: a business publishes *"we pay $2,400/month for cleaning, 8,000 sq ft, 3× weekly."* A cleaning company browsing the platform replies *"we'll do it for $1,875."*

Working name is undecided — don't invent one in code, docs, or UI copy.

Full product spec and scope decisions: [plan/plan1.md](plan/plan1.md). Step-by-step build order: [roadmap/](roadmap/). Coding rules: [.claude/codingrules.md](.claude/codingrules.md). Follow the coding rules for every file you create or edit.

## Status

Planning → early build. No application code exists yet; `frontend/` and `backend/` get created as work starts.

Two earlier concepts are **removed from scope**: an equipment-shopping and camera-audit product (with fruit-fly neural models — Compound Eye, Mushroom Body, FlyHash), and an outbound RFQ product where the platform emailed token-scoped invitations to vendors it discovered. Don't reintroduce either; treat surviving references as stale. Outbound discovery and invitation persist only as a **secondary path for seeding marketplace supply**, subordinate to the public loop.

## Tech stack

- **Frontend:** React + TypeScript, Vite. Responsive — challengers browse on phones.
- **Backend:** Python + FastAPI. Async REST, Pydantic request/response models.
- **Database:** Postgres via Supabase.
- **Identity:** one account type — every account is a business that can both publish expenses and challenge others'. Seeded demo accounts with an in-app switcher. **No signup, no passwords, no auth flows.** Real auth is post-MVP.
- **Jobs:** small background worker for imports, evidence lookups, and invitations.
- **Financial adapters:** `TransactionSource` interface — Stripe Financial Connections sandbox for the MVP, with labeled fixtures as the deterministic fallback. Rho and Mercury are post-MVP.
- **Discovery:** Tavily behind a provider interface (secondary path only).
- **AI:** Claude for categorization suggestions, scope drafting, offer extraction, evidence summaries. Structured outputs everywhere JSON is consumed; never parse prose. Confirm the current model ID during implementation rather than hardcoding one from memory.
- **Updates:** polling. No websockets.
- **Hosting:** HTTPS app and API with publicly reachable profile and listing pages.

## Repo layout

- `frontend/` — React + TS app (Vite).
- `backend/` — FastAPI app.
- `plan/` — design docs. `plan1.md` is the plan of record.
- `roadmap/` — phase-by-phase build order, one file per phase.
- `assets/` — brand assets. Current contents are from the removed fly concept and are stale.
- `.claude/` — Claude Code project configuration and coding rules.

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

- **One category (commercial cleaning), one service area, one financial integration.**
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

Tracked at the end of [plan/plan1.md](plan/plan1.md) and in [roadmap/README.md](roadmap/README.md). The two that block the most: which real business supplies the genuine counteroffer, and whether the Stripe sandbox flow exposes enough simulated recurring service spend for the demo.
