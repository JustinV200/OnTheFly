# Archived marketplace plan

Historical reference only. The current REBID scope and priorities are in [plan1.md](plan1.md). Completion claims and build order below are superseded; retain this document for earlier design rationale.

# Plan 1: Public Spend Profiles and Open Challenges

## Product

> List what you pay. Let anyone offer to beat it.

A B2B marketplace where a business connects its financial account, sees every expense in a dashboard, and chooses which ones to make public. Public expenses appear on the business's profile, where any other business on the platform can see them and post a counteroffer.

The product sits at the intersection of fintech, procurement, and marketplaces. Its starting point is a payment the company already makes; its engine is voluntary price transparency.

**Core interaction:** a business publishes *"we pay $2,400/month for commercial cleaning, 8,000 sq ft, 3× weekly."* A cleaning company browsing the platform sees it and replies *"we'll do it for $1,875."*

Working name is undecided.

This plan supersedes two earlier concepts: an equipment-shopping and camera-audit product, and an outbound RFQ product in which the platform found vendors and emailed them invitations. The fruit-fly theme, neural models, and camera features are outside this build. Outbound discovery and invitation survive only as a **secondary path** for seeding the marketplace's supply side (§8).

## Why inbound

The outbound version required the platform to find vendors, qualify them, and email them before anything could happen — a lot of machinery standing between a user and their first result, and a lot of unsolicited email.

Publishing inverts it. The buyer does one cheap action (make an expense public) and competitors come to them. It scales without outreach infrastructure, it produces a browsable marketplace rather than a series of private auctions, and every published expense is a standing invitation rather than a one-time request.

The cost of that inversion is a cold-start problem: inbound only works if someone is browsing. §8 is the answer to that, and it is why outbound isn't deleted outright.

## Target Customer and Initial Category

One account type. Every account is a business with a profile: it can publish its own expenses and challenge anyone else's. A cleaning company that undercuts someone's janitorial contract also pays for waste hauling and software — the symmetry is real, not cosmetic.

Start with **commercial cleaning in one city or service area**, where scope can be described in a handful of fields: location, square footage, frequency, bathrooms, included supplies, service expectations.

Later categories could include landscaping, pest control, waste hauling, office coffee/water, copier servicing, managed IT, and security services. Each needs its own scope template.

## The Product Loop

```text
Connect business account
          ↓
Every expense appears in a private dashboard
          ↓
Owner toggles individual expenses public
          ↓
Public expenses appear on the business's profile
          ↓
Any platform user browses profiles and the marketplace feed
          ↓
A viewer clicks "Challenge" and submits a counteroffer
          ↓
Owner reviews counteroffers against the current price
          ↓
Compare equivalent offers, challenger evidence, potential savings
          ↓
Owner shortlists a challenger and requests follow-up
```

The hackathon demo ends with a real counteroffer from a real business. Binding contracts, payment, and service delivery are outside the MVP.

## 1. Connect Financial Data

### Connection strategy

- **Stripe Financial Connections:** the sole MVP financial adapter, using Stripe sandbox accounts and test data for the hackathon.
- **Demo source:** clearly labeled fixtures for the exact recurring service payments missing from Stripe's simulated data.
- **Post-MVP:** additional providers can implement the same normalized interface, but Rho and Mercury are not part of the hackathon scope.

Validate authentication, transaction access, pagination, available fields, and sandbox contents against provider documentation during implementation. Earlier notes about sandbox contents must be rechecked before being treated as dependencies.

The MVP needs read access to transaction history only. Provider credentials stay server-side.

### Shared data model

A `TransactionSource` adapter returns normalized records:

- Provider, account ID, transaction ID, and source type
- Raw merchant description and normalized vendor
- Amount in integer minor units, currency, date, and status
- Available category, memo, counterparty, and supporting attachment references

Deduplicate imports and preserve links back to the original records. Exclude transfers and reconcile reversals/refunds so spend is not inflated. Keep currencies separate unless an explicit conversion basis is supplied.

Display whether evidence came from a connected production account, sandbox, imported record, or demo fixture.

**Everything imports private.** Visibility is never a default, an inference, or a side effect of import (§3).

## 2. The Expense Dashboard

The dashboard shows **every** expense, not a filtered set of opportunities. It is the user's private view of their own spend, and it is the screen they spend the most time on.

Group payments by vendor, detect recurrence, and estimate the current cost of each service. Show the observation period and the supporting transactions behind every figure.

Each row shows: vendor, category, amount per period, cadence, annualized cost, recurrence confidence, and **visibility state**.

Transactions reveal payment patterns, not contract terms or service scope. Let the user correct vendor, category, and cadence; corrections persist across future imports.

### Suggested listings

Not every expense is worth publishing. The dashboard suggests candidates using an explainable heuristic:

```text
listing priority =
weighted( annualized spend, replaceability, recurrence confidence, ease of describing scope )
```

A weighted sum rather than a product, so each factor's contribution can be shown. These are normalized heuristics that rank suggestions; they do not predict savings. Show the reasons alongside the rank.

| Expense | Initial treatment |
|---|---|
| Commercial cleaning | Strong candidate when scope and location can be confirmed |
| Landscaping, pest control, waste hauling | Candidates for later category templates |
| Managed IT or security | Requires service-level detail; deprioritize |
| Cloud infrastructure | Often complex to substitute; deprioritize |
| Rent | Usually lease-constrained; deprioritize |
| Payroll, taxes, internal transfers | Never suggested, never publishable |

Suggestion is advice. The owner decides what goes public, and may publish something the heuristic ranked low.

### Dashboard sketch

Example figures throughout this plan are illustrative.

```text
Your expenses                          $184,200/year tracked

ABC Cleaning          $2,400/mo   $28,800/yr   monthly · high confidence   [ Public  ●—]
Regional Waste Co     $   680/mo  $ 8,160/yr   monthly · high confidence   [—● Private]
Copier Service Ltd    $   310/mo  $ 3,720/yr   monthly · med confidence    [—● Private]
Payroll                    —           —       not eligible                 ⊘
```

## 3. Visibility and Public Profiles

The toggle is the product's central mechanic and its central risk.

### Rules

- **Private is the default and the fallback.** Imported expenses are private. An expense whose state is ambiguous for any reason is private.
- **Publishing is explicit and per-expense.** No bulk publish without a confirmation listing every affected item individually.
- **Publishing requires a scope.** A price with no scope is not a listing anyone can meaningfully counter, so the publish flow includes scope confirmation (§4).
- **The owner previews the exact public payload before publishing** and can unpublish at any time, immediately.
- **The public projection is constructed explicitly, never filtered down from the private record.** A public listing is its own shape, built field by field. Deriving it by omitting fields from a rich object means the next field someone adds is public by accident.

### What a public listing contains

| Published | Never published |
|---|---|
| Category and scope summary | Raw transaction history |
| Price and billing cadence | Account or connection details |
| Service area (approximate) | Other expenses, public or private |
| Whether challenges are open, and any deadline | Exact street address, unless opted in |
| Count of challenges received | Challenger identities |
| Bidding mode, and offer amounts if open | Offer amounts while bidding is sealed |

**The incumbent vendor's name is a separate opt-in, hidden by default.** Publishing "we pay ABC Cleaning $2,400/month" discloses a third party's pricing, which may be commercially sensitive or restricted by the contract itself. The owner is warned about this at publish time and must opt in deliberately.

### The profile

Each business has a public profile: name, service area, and its public expense listings. The profile is the business's presence on the platform — the thing a challenger looks at to decide whether to bother, and the thing §7's evidence attaches to.

## 4. Scope, So a Counteroffer Means Something

Publishing an expense opens a short scope confirmation. For the cleaning demo:

- Service area and approximate location
- Office size: 8,000 square feet
- Frequency: three visits per week
- Bathrooms: four
- Required tasks and quality expectations
- Whether supplies, equipment, and taxes are included
- Required insurance or other requirements
- Desired start date, minimum term, known cancellation constraints
- Current price: $2,400/month, subject to owner confirmation
- Whether challenges have a deadline, and whether bidding is open or sealed

AI drafts the scope from transaction evidence plus owner-provided details. **Missing details remain explicit questions; the model must not invent them from a merchant name.** A field can be explicitly unanswered, which is different from empty — "bathrooms: not specified" is real information to a challenger, "bathrooms: 0" is a lie.

Scope is **versioned**. Counteroffers attach to the version they were made against, so editing scope later cannot retroactively reframe an existing offer.

## 5. The Marketplace and the Challenge

### Browsing

Any platform user can browse a feed of public listings, filtered by category and service area, and can view any business's profile. The feed is how a cleaning company finds work; the profile is how it evaluates a specific counterparty.

### Challenging

A viewer clicks **Challenge** on a listing and submits a counteroffer against that scope version:

- Price, currency, and billing frequency
- Included service scope, exclusions, and optional extras
- Setup fees, taxes, supplies, minimum term, other price conditions
- Availability, offer expiry, and whether a site visit is required
- Supporting documents and a message to the owner
- Their platform identity, which carries their profile and evidence

A challenger may revise their own offer until the deadline; revision history is retained.

### Counteroffer visibility — the owner chooses

Open bidding is **a per-listing toggle, default off**, set by the owner at publish time and changeable afterward:

| Toggle | Other challengers see | Owner sees |
|---|---|---|
| **Off — sealed** (default) | How many offers exist, nothing more | Everything |
| **On — open bidding** | Every offer's price and scope, anonymized | Everything, including identities |

Like expense visibility, the safe state is the default and the fallback: a listing whose mode is unset, ambiguous, or errored is sealed.

**Open bidding is what turns this into an auction.** Challengers see where they stand, can revise downward before the deadline, and get told when they're outbid. It's the mode that makes a listing competitive rather than a set of independent guesses, and it's why an owner would choose it.

**Identity stays anonymous to other challengers in both modes.** Prices go public in open bidding; who offered them does not. A cleaning company that can watch competitors' rates accumulate across every listing learns its rivals' entire pricing structure, which is a real commercial harm and the fastest way to make providers stop participating. The owner always sees identities — evaluation is unaffected.

Two rules make the mode safe:

- **The mode is shown on the listing and in the challenge form before anyone submits.** A challenger must never discover after the fact that their price became public.
- **A mode change never applies retroactively.** Offers submitted under sealed terms stay sealed even if the owner later opens bidding. The challenger may opt in to publish theirs; otherwise it remains private and still counts. The mode in force at submission is recorded on the offer.

Open bidding has a known failure mode: a bare price leaderboard rewards under-scoping, because the cheapest way to bid lower is to quietly offer less. **The public leaderboard therefore shows scope completeness beside price**, never price alone (§6).

An owner cannot bid on their own listing.

### Provenance

Every counteroffer carries its origin: `challenger-submitted`, `captured from an off-platform response`, or `demo data`. AI can extract an offer from an email, but the displayed amount retains its original evidence. **An AI estimate is not a counteroffer.**

## 6. Compare Cost, Scope, and Evidence

Normalize offers to a common period and surface scope differences **before** ranking on price. A lower price for fewer visits does not satisfy the scope.

This applies to the public leaderboard in open bidding as much as to the owner's private comparison. A leaderboard ordered on price alone teaches challengers that the way to win is to quietly offer less, so every public rank shows scope completeness beside the number.

```text
annual recurring savings = (current monthly cost − offer monthly cost) × 12

first-year net savings =
annual recurring savings − switching costs − setup fees − cancellation fees
```

Include known recurring extras on the same basis. If material costs or conditions are unknown, label the result provisional and show the assumptions.

Example, assuming equivalent scope and no additional fees:

| Challenger | Monthly price | Potential annual recurring savings | Evidence status |
|---|---:|---:|---|
| Current provider | $2,400 | Baseline | Existing expense confirmed |
| Company A | $2,200 | $2,400 | Selected checks complete |
| Company B | $1,875 | $6,300 | Stronger evidence; insurance pending |
| Company C | $1,500 | $10,800 | Legal entity match unresolved |

The recommendation explains price and scope tradeoffs against specific evidence. Company B may be the better shortlist candidate even though Company C is cheaper.

Actions: **View evidence**, **Request clarification**, **Shortlist / Request follow-up**. Savings remain potential until a switch actually happens.

## 7. Evaluate Challengers With Public Evidence

A stranger has just offered to undercut your cleaner by 40%. Who are they?

Show verifiable facts and gaps next to each counteroffer. Avoid an opaque "trustworthiness" score.

| Signal | Candidate source | What the UI should communicate |
|---|---|---|
| Entity registration | Relevant state business registry | Matched legal entity, status, formation date, source |
| Reputation | Google Places or accessible review sources | Rating, review count, source, recency; reviews are user-generated |
| Government exclusions | SAM.gov exclusion records | Match, possible match, or no match within the source checked |
| Relevant regulatory history | OSHA for applicable businesses | Matched records with dates and context |
| Insurance or required license | Supplied documents and applicable issuer | Supplied, checked, expired, or unverified |
| Platform history | Internal | Account age, listings published, counteroffers made |

Match records using legal name plus location and identifiers where available.

**Adverse records require an identifier-level match.** Name plus city is never sufficient to attach an exclusion or violation to a business. At lower confidence, the UI reports that a possible match needs review — never the record's contents as though they belong to this challenger.

Each check records source, timestamp, match confidence, result, and limitations. An unavailable source means **not checked**. A search with no result means **no match found in this source**, never "proven safe."

Use labels such as **checks complete for selected sources**, **needs review**, and **information missing**. No blanket "verified" badge when only some facts have been checked.

Prioritize entity matching and reputation; add other sources as access permits. Show unimplemented checks honestly.

## 8. Seeding Supply: Outbound as a Secondary Path

Inbound has a cold-start problem. A published listing with nobody browsing is a tree falling in an empty forest.

The outbound machinery from the previous plan is retained for exactly this job:

- **Discovery:** Tavily search and extraction finds real providers in the category and service area, deduplicated and filtered to actual providers rather than directories.
- **Invitation:** the owner may invite specific providers to come and challenge a listing. Email first; SMS and ElevenLabs voice are stretch.

This is a **secondary path**, subordinate to the public loop:

- Invitations require explicit owner approval of recipients and message contents.
- A job queue tracks deliveries, failures, retries, and responses; reprocessing never sends duplicates.
- Commercial email carries accurate headers, a physical postal address, and a working opt-out.
- An invited challenger lands on the same public listing every other user sees. There is no separate private RFQ flow and no token-scoped parallel universe.

For the hackathon, arrange a willing real business early and get a genuine counteroffer. Sending external messages is a separate action requiring owner approval; rewriting this plan does not initiate outreach.

## Core Screens

1. **Expense dashboard:** connect an account, view import status, browse every expense, toggle visibility.
2. **Publish flow:** confirm scope, choose disclosure, preview the exact public payload, publish.
3. **Public profile:** a business and its public listings, as any user sees it.
4. **Marketplace feed and listing detail:** browse public listings; challenge one.
5. **Challenge inbox and comparison:** review counteroffers, normalized costs, scope gaps, evidence, savings.

## Product Experience and Visual Direction

The current interface is functional scaffolding and will be redesigned before the demo. The target is a modern financial product: Robinhood-like clarity around money and primary actions, combined with Supabase-like structure, restraint, and dashboard polish. These products are references for interaction quality and visual hierarchy, not templates to copy.

### Design principles

- **Make the money legible.** Current spend, potential savings, offer price, cadence, and provenance should be visually distinct and easy to scan.
- **One obvious action per state.** Connect, publish, challenge, compare, and shortlist each get a clear primary action; secondary controls stay quiet.
- **Trust before decoration.** Privacy state, data source, scope completeness, bidding mode, and whether savings are potential must remain visible without opening another screen.
- **Calm density.** Use generous spacing, compact data tables, restrained borders, and cards only where they clarify grouping. Avoid a wall of disconnected dashboard cards.
- **Progressive disclosure.** Summary first; transaction evidence, scope assumptions, audit history, and advanced controls expand on demand.
- **Fast feedback.** Use skeletons for initial loading, optimistic feedback only for reversible actions, inline validation, actionable errors, and intentional empty states. Never leave the user on a blank white screen or indefinite `Loading...` text.
- **Responsive by default.** Desktop supports dense spend review; mobile prioritizes marketplace browsing, listing detail, and challenge submission.
- **Accessible and consistent.** Shared color, type, spacing, radius, shadow, focus, status, table, form, modal, toast, and navigation primitives; keyboard-visible focus and sufficient contrast.

### Visual system

- Neutral foundation with one restrained green accent for positive financial outcomes and primary actions; red is reserved for destructive or genuinely adverse states.
- Modern sans-serif typography with tabular numerals for monetary values.
- Persistent application shell with product identity, primary navigation, current-business switcher, and connection state.
- Reusable primitives for buttons, inputs, badges, metric blocks, data tables, offer cards, comparison rows, dialogs, skeletons, empty states, and error banners.
- Subtle motion may reinforce state changes, but must never delay publishing, unpublishing, or submitting a challenge.

### Screen treatment

1. **Expense dashboard:** headline spend and opportunity metrics, filter/search controls, a polished expense table, clear private/public states, and a side panel or focused flow for expense detail.
2. **Publish flow:** a short step sequence for scope, disclosure, exact public preview, and confirmation; the final action must feel deliberate.
3. **Marketplace:** browseable listing cards with category, service area, current spend, deadline, bidding mode, offer count, and scope completeness.
4. **Listing and challenge:** strong price hierarchy, plain-language scope, trust/provenance cues, and a focused counteroffer form.
5. **Comparison:** incumbent versus challengers in aligned columns, with scope gaps and assumptions shown before potential savings.

The redesign is complete only when all five core screens share the same shell and component system, work at phone and desktop widths, and have loading, empty, error, success, and disabled states. A favicon and basic product metadata are included so the app no longer presents as an unfinished browser tab.

## Technical Architecture

- **Frontend:** React + TypeScript with Vite; responsive, since a challenger will browse on a phone.
- **Backend:** Python + FastAPI with Pydantic request/response models.
- **Database:** Postgres via Supabase.
- **Identity:** one account type. For the hackathon, seeded demo accounts with an in-app switcher — no signup, no password reset. Real auth is post-MVP.
- **Jobs:** a small background worker for imports, evidence lookups, and outbound invitations.
- **Financial adapters:** Stripe Financial Connections sandbox for the MVP, with labeled demo fixtures as the deterministic fallback.
- **Discovery:** Tavily behind a provider interface (secondary path).
- **Reasoning:** Claude for categorization suggestions, scope drafting, offer extraction, and evidence summaries; confirm the model ID during implementation.
- **Updates:** polling is sufficient for incoming challenges.
- **Hosting:** an HTTPS app and API with publicly reachable profile and listing pages.

Use deterministic code for monetary calculations, deduplication, deadlines, visibility state, and offer versions. Use structured model outputs for every field the application consumes.

### Main entities

| Entity | Purpose |
|---|---|
| Account / BusinessProfile | Platform identity, public presence |
| Connection / Transaction | Source account and original spend evidence |
| Vendor / ServiceExpense | Normalized payee and recurring service baseline |
| Visibility | Per-expense public/private state, disclosure options, audit trail |
| Listing / ScopeVersion | The public projection, its versioned scope, and its bidding mode |
| Challenge / ChallengeRevision | A counteroffer, its conditions, provenance, revision history, and the bidding mode in force when it was submitted |
| ChallengerEvidence | Source-backed checks and identity-match status |
| Invitation | Secondary path: provider, approved message, delivery state |
| Comparison | Normalized costs, scope differences, savings assumptions |

Listing states: `private → scope confirmed → public → closed → shortlisted`. Unpublishing returns a listing to private and retains its received challenges.

## End-to-End Demo

All names, prices, and counts are a script template, not claims of existing integrations or received offers.

1. Show a working Stripe Financial Connections sandbox connection and label the returned data as sandbox data.
2. Show the expense dashboard with every expense private by default.
3. Toggle **commercial cleaning, $2,400/month** to public; confirm the scope; preview exactly what becomes public; publish.
4. Show the public profile with the listing on it.
5. Switch accounts. Browse the marketplace feed as a different business, open the listing, submit a counteroffer.
6. Switch back. Refresh the challenge inbox and show the new challenge and its evidence.
7. Turn on **open bidding**, switch to a third account, and underbid the standing offer — showing the anonymized leaderboard with scope completeness beside each price.
8. Display a genuine counteroffer from a real business, ideally **$1,875/month** if that is the actual price offered; otherwise its real amount.
9. Show the scope comparison, outstanding evidence checks, and potential annual savings — at $1,875/month, **$6,300/year** before additional costs.
10. Shortlist the challenger; show the expense, listing, scope version, and offer all linked.
11. Unpublish the listing to show the owner stays in control.

**Minimum target: one genuine counteroffer from a real business.** Additional offers may be labeled demo examples. If none arrives, show the working publish-and-challenge loop and label all sample offers as simulated, in the UI and not only aloud.

## Build Order

Detailed step-by-step breakdown lives in [../roadmap/](../roadmap/).

1. **Foundations:** deploy early, since public profiles must be publicly reachable. Money and provenance primitives, seeded accounts, account switcher.
2. **Validate the real counteroffer path:** identify a concrete need and a willing real provider; get them onto the platform, or capture their quote with provenance.
3. **Financial ingestion:** Stripe Financial Connections sandbox, the normalized transaction model, and labeled fixtures — everything private.
4. **Expense dashboard:** vendor grouping, recurrence, annualized baseline, corrections, listing suggestions.
5. **Visibility and profiles:** the toggle, the explicit public projection, scope confirmation, the publish preview, the profile page.
6. **Marketplace and challenges:** feed, listing detail, challenge submission and revision, and an inbox refreshed by polling.
7. **Comparison:** normalization, scope gaps, savings arithmetic, the challenge inbox.
8. **Challenger evidence:** identity matching first, then entity registration and reputation.
9. **Outbound secondary path:** Tavily discovery, approved invitations, delivery tracking.
10. **UI modernization and demo polish:** implement the shared visual system and responsive shell, redesign the five core screens, add complete loading/empty/error states, then rehearse the full script on deployed infrastructure.
11. **Stretch:** additional financial providers, real auth, off-platform reply extraction, voice outreach, anonymous live underbidding, more categories.

The priority is completing the account → dashboard → publish → challenge → compare loop.

## Success Criteria

- A real financial adapter works and exposes traceable transaction evidence.
- Recurring expenses are identified without counting transfers or duplicate imports.
- Every expense imports private, and publishing is always an explicit owner action.
- The owner sees exactly what will become public before it does, and can unpublish instantly.
- A public listing carries enough scope for a counteroffer to be meaningful.
- A second account can browse, find the listing, and submit a counteroffer.
- Counteroffers are sealed by default, and go public only when the owner turns open bidding on.
- Turning open bidding on never retroactively publishes an offer submitted while it was off.
- Challenger identities stay hidden from other challengers in both modes.
- Public checks distinguish matched facts, uncertain matches, and missing information.
- At least one actual business supplies a genuine counteroffer.
- Savings calculations use comparable prices and make unknown costs visible.
- The owner can explain why a shortlisted challenger is attractive beyond price.

## Scope Boundaries

**MVP:** one category, one service area, one financial integration, seeded accounts, per-expense visibility, public profiles, a marketplace feed, sealed counteroffers with an owner-controlled open-bidding toggle, evidence-backed comparison, and a genuine offer from a real business.

**Later:** real authentication, additional financial providers, more categories, fully identified public bidding, payment routing, contract execution, subscription or success-fee pricing, savings tracking after switching, and reputation built from completed switches.

**Removed from prior plans:** equipment shopping lists, product-camera overlays, visual inventory audits, fly attention models, FlyHash, asset management, and the token-scoped private RFQ flow.

## Questions to Resolve During the Build

- Which actual business and cleaning scope anchors the real counteroffer, and will that provider create an account or respond off-platform?
- What account or sandbox access is available, and does it contain relevant recurring spend?
- Which public-data sources can be accessed reliably within the build window?
- What is the wall-clock cutoff after which the demo runs on labeled-simulated offers?
- How much time and how many builders are available?

