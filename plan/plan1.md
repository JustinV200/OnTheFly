# Plan 1: Spend-Driven Bidding Marketplace

## Product

> Connect your business account and let competitors bid to beat what you already pay.

A B2B procurement marketplace that turns existing company spend into competitive requests for quotes and reverse auctions. Connected financial data identifies the opportunity; web discovery finds competing providers; public records help the buyer evaluate them; real vendors submit offers for the same service.

The product sits at the intersection of fintech, procurement, and marketplaces. Its starting point is a payment the company already makes.

**Core interaction:** “You're paying $2,400/month for cleaning. Want to see if someone can beat it?”

Working name is undecided. This plan supersedes the equipment-shopping and camera-audit concept. The fruit-fly theme, neural models, and camera features are outside this build.

## Target Customer and Initial Category

The buyer is a small-business owner, operations lead, or finance manager responsible for recurring service expenses.

Start with **commercial cleaning in one city or service area**. A quote request can be structured around location, square footage, frequency, bathrooms, included supplies, and service expectations. Confirm these details with the buyer before contacting providers.

Later categories could include landscaping, pest control, waste hauling, office coffee/water, copier servicing, managed IT, and security services. Each needs its own scope template and qualification criteria.

## The Product Loop

```text
Connect business account
          ↓
Group vendor payments and detect recurring spend
          ↓
Rank services worth putting out to bid
          ↓
Buyer selects “Challenge this price”
          ↓
Confirm service scope and publish a quote request
          ↓
Find competitors and collect public evidence
          ↓
Invite qualified vendors
          ↓
Vendors submit or revise bids
          ↓
Compare equivalent offers, evidence, and potential savings
          ↓
Buyer shortlists a provider and requests a follow-up
```

The hackathon demo ends with a real competing quote. Accepting a binding contract, paying for the service, and having it performed are outside the MVP.

## 1. Connect Financial Data

### Connection strategy

- **Rho first:** build the first real financial adapter for the hackathon.
- **Mercury next:** support another business account through the same normalized interface when time permits.
- **Other accounts later:** add connectors or a structured transaction import.
- **Demo source:** provide clearly labeled fixtures for recurring service payments missing from the available sandbox.

Validate authentication, transaction access, pagination, available fields, and sandbox contents against provider documentation during implementation. Earlier plan notes about sandbox access and specific transaction counts must be rechecked before being treated as dependencies.

The MVP only needs read access to transaction history. Keep provider credentials server-side.

### Shared data model

A `TransactionSource` adapter returns normalized records:

- Provider, account ID, transaction ID, and source type
- Raw merchant description and normalized vendor
- Amount in integer minor units, currency, date, and status
- Available category, memo, counterparty, and supporting attachment references

Deduplicate imports and preserve links back to the original records. Exclude transfers and reconcile reversals/refunds so spend is not inflated. Keep different currencies separate unless an explicit conversion basis is supplied.

Display whether evidence came from a connected production account, sandbox, imported record, or demo fixture.

## 2. Find Expenses Worth Challenging

Group payments by vendor, identify recurrence, and estimate the current cost of each service. Show the observation period and the transactions supporting the estimate.

A large expense is not automatically a good opportunity. Rank candidates using an explainable heuristic:

```text
opportunity priority =
annualized spend × replaceability × recurrence confidence × ease of quoting
```

The factors are normalized heuristics; this ranks opportunities and does not predict guaranteed savings. Show the reasons alongside the rank.

| Expense | Initial treatment |
|---|---|
| Commercial cleaning | Strong candidate when scope and location can be confirmed |
| Landscaping, pest control, waste hauling | Candidates for later category templates |
| Managed IT or security | Requires more detail about service levels and switching constraints |
| Cloud infrastructure | Often complex to substitute; deprioritize for this MVP |
| Rent | Usually constrained by an existing lease; deprioritize |
| Payroll, taxes, internal transfers | Exclude from vendor bidding |

Transactions reveal payment patterns, but often do not reveal contract terms or service scope. Let the user correct the vendor/category and confirm that the expense is eligible to be challenged.

### Opportunity screen

Example figures throughout this plan are illustrative until replaced with actual evidence.

```text
$87,400/year in potentially contestable spend

ABC Cleaning
$2,400/month · $28,800/year
Recurring payments detected
Scope confirmation needed

[ Challenge this price ]
```

“Contestable spend” is the value of eligible expenses, not the amount the platform will save.

## 3. Turn Spend Into a Comparable Quote Request

Clicking **Challenge this price** opens a short request-for-quote (RFQ) draft.

For the cleaning demo:

- Service area and approximate location
- Office size: 8,000 square feet
- Frequency: three visits per week
- Bathrooms: four
- Required tasks and quality expectations
- Whether supplies, equipment, and taxes are included
- Required insurance or other buyer requirements
- Desired start date, minimum term, and known cancellation constraints
- Current price: $2,400/month, subject to buyer confirmation
- Bid deadline and quote validity requirements

AI drafts the RFQ from transaction evidence plus buyer-provided details. Missing details remain explicit questions; the model must not invent them from a merchant name.

The buyer reviews the scope, recipients, and information to be shared before publishing or sending invitations. Current price may be disclosed as the price to beat if the buyer chooses; raw transaction history and account details are never part of the vendor-facing request.

## 4. Find Competing Providers

Use Tavily for vendor discovery and extraction of relevant public business pages. Search by category, service area, and the confirmed requirements.

For each candidate, collect:

- Business and, where available, legal entity name
- Website and source URLs
- Service coverage and category fit
- Business contact details published for inquiries
- Relevant capabilities and evidence of scope fit

Deduplicate directory listings and distinguish an actual provider from an aggregator. Save source links and retrieval times. Extract service claims from provider pages, but do not treat marketing text as independent verification.

The initial target is a short list of roughly 5–10 relevant providers. Broad discovery counts matter less than whether a provider can quote the actual job.

## 5. Evaluate Providers With Public Evidence

Show verifiable facts and gaps next to each bid. Avoid an opaque “trustworthiness” score.

The following are candidate sources to validate during implementation; access requirements and coverage may vary.

| Signal | Candidate source | What the UI should communicate |
|---|---|---|
| Entity registration | Relevant state business registry, such as New York's | Matched legal entity, status, formation date, and source |
| Reputation | Google Places or accessible review sources | Rating, review count, source, and recency; reviews are user-generated |
| Government exclusions | SAM.gov exclusion records | Match, possible match, or no match within the source checked |
| Relevant regulatory history | OSHA for applicable businesses | Relevant matched records and their dates/context |
| Insurance or required license | Vendor documents and applicable issuer/registry | Supplied, checked, expired, or still unverified |

Match records using legal name plus location and identifiers where available. Similar names require review before attaching an adverse record to a provider.

Each check records its source, timestamp, match confidence, result, and limitations. An unavailable source means **not checked**. A search with no result means **no match found in this source**, never “proven safe.”

Use evidence labels such as **checks complete for selected sources**, **needs review**, and **information missing**. Do not apply a blanket “verified vendor” badge when only some facts have been checked.

For a tight MVP, prioritize entity matching and reputation evidence; add SAM and relevant regulatory checks as source access permits. Show unimplemented or unavailable checks honestly.

## 6. Publish the Opportunity and Invite Bids

Each approved RFQ becomes a listing with a vendor response link. The initial marketplace is invitation-based: providers can participate without first creating a full account.

- Buyer sees the RFQ, invited providers, outreach status, and incoming bids.
- Vendor sees the confirmed service scope and can submit a quote through its invitation link.
- The link is scoped to that RFQ and provider, with an expiration.
- Email is the first outreach channel.
- SMS and ElevenLabs voice outreach are stretch integrations.

Invitations identify the requesting business and explain the job and response deadline. A job queue tracks deliveries, failures, retries, and responses; repeated processing must not send duplicate invitations.

For the hackathon, arrange a willing real business early and obtain a genuine quote for a concrete scope. Sending external messages is a separate implementation/demo action requiring the buyer's approval; rewriting this plan does not initiate outreach.

## 7. Bidding Mechanics

The MVP uses **private competitive quotes**:

- Invited providers submit offers for the same version of the scope.
- They can revise their own offers until the deadline; retain revision history.
- Competitors' identities and individual quotes stay private.
- The buyer sees the full comparison and selects whom to follow up with.

A later live reverse-auction mode can show an anonymous best eligible price and let providers bid lower. The MVP proves the competitive procurement loop without depending on simultaneous vendor attendance.

A bid contains:

- Vendor identity and contact
- Price, currency, and billing frequency
- Included service scope, exclusions, and optional extras
- Setup fees, taxes, supplies, minimum term, and other price conditions
- Availability, quote expiry, and whether a site visit is required
- Supporting documents and submission timestamp
- Provenance: vendor-submitted, captured from a vendor response, or demo data

AI can extract a quote from a response, but the displayed amount must retain its original evidence. An AI estimate is not a vendor bid.

## 8. Compare Cost, Scope, and Evidence

Normalize offers to a common period and highlight differences before ranking them. A lower price for fewer visits does not satisfy the original scope.

For equivalent monthly service:

```text
annual recurring savings = (current monthly cost − bid monthly cost) × 12

first-year net savings =
annual recurring savings − switching costs − setup fees − cancellation fees
```

Include known recurring extras on the same basis. If material costs or conditions are unknown, label the result provisional and show the assumptions.

Example comparison, assuming equivalent scope and no additional fees:

| Provider | Monthly price | Potential annual recurring savings | Evidence status |
|---|---:|---:|---|
| Current provider | $2,400 | Baseline | Existing expense confirmed |
| Company A | $2,200 | $2,400 | Selected checks complete |
| Company B | $1,875 | $6,300 | Stronger evidence; insurance pending |
| Company C | $1,500 | $10,800 | Legal entity match unresolved |

The recommendation explains price and scope tradeoffs and points to specific evidence. Company B may be the better shortlist candidate even though Company C is cheaper.

Actions are **View evidence**, **Request clarification**, and **Shortlist / Request follow-up**. Quotes remain potential savings until a switch actually happens.

## Core Screens

1. **Connections and opportunities:** connect an account, view import status, and browse ranked recurring expenses.
2. **Challenge builder:** confirm service scope, price baseline, requirements, and disclosure settings.
3. **Vendor discovery and evidence:** review provider fit, public-record findings, and invitation recipients.
4. **Vendor bid page:** read the scope and submit or revise a quote.
5. **Bid comparison:** compare normalized costs, scope gaps, evidence, and projected savings.

## Technical Architecture

Preserve the existing general stack choices:

- **Frontend:** React + TypeScript with Vite; responsive buyer and vendor pages.
- **Backend:** Python + FastAPI with Pydantic request/response models.
- **Database:** Postgres via Supabase.
- **Jobs:** a small background worker for imports, discovery, evidence lookups, and outreach.
- **Financial adapters:** Rho first, labeled demo fixtures, then Mercury or imports.
- **Discovery:** Tavily search/extraction behind a provider interface.
- **Reasoning:** Claude for categorization suggestions, scope drafting, quote extraction, and evidence summaries; choose an available model during implementation.
- **Outreach:** one email provider first; ElevenLabs voice as stretch.
- **Updates:** polling is sufficient for incoming bids in the MVP.
- **Hosting:** deploy an HTTPS app and API with a publicly reachable vendor form.

Use deterministic code for monetary calculations, deduplication, deadlines, and bid versions. Use structured model outputs for the fields the application consumes. Store supporting evidence for recommendations and extracted claims.

A single demo buyer workspace is sufficient; a full organization/role system can wait. Keep its financial screens private and restrict public access to the intended vendor invitation pages.

### Main entities

| Entity | Purpose |
|---|---|
| Connection / Transaction | Source account and original spend evidence |
| Vendor / ServiceExpense | Normalized payee and recurring service baseline |
| Opportunity | Challenge candidate, ranking reasons, and confidence |
| RFQ / ScopeVersion | Buyer-confirmed requirements, disclosure choices, deadline |
| VendorEvidence | Source-backed checks and identity-match status |
| Invitation | Provider, authorized message, delivery state, and response link |
| Bid / BidRevision | Vendor offer, conditions, provenance, and revision history |
| Comparison | Normalized costs, scope differences, and savings assumptions |

RFQ states: draft → scope confirmed → open for bids → closed → shortlisted. A cancelled RFQ stays recorded with its bids and outreach history.

## End-to-End Demo

All names, prices, and counts below are a script template, not claims of existing integrations or received bids.

1. Show a working Rho connection and the actual transaction data available.
2. Show a confirmed recurring cleaning expense of **$2,400/month**. If this is absent from the sandbox, switch visibly to a labeled fixture or use a consenting business's imported records.
3. Click **Challenge this price** and confirm the cleaning scope.
4. Find relevant local providers and open the evidence behind one candidate.
5. Publish the RFQ and show approved invitation delivery.
6. Open the vendor response page and demonstrate the bid submission flow.
7. Display a genuine provider quote, ideally **$1,875/month** if that is the actual price offered; otherwise use its real amount.
8. Show the scope comparison, outstanding evidence checks, and potential annual savings. At $1,875/month, that is **$6,300/year** before additional costs.
9. Shortlist the provider and show that the original expense, RFQ, evidence, and quote are linked.

**Minimum target: one genuine quote.** Additional comparison bids may be labeled demo examples. Obtain the real response before judging when possible and display its actual timestamp; a live response is a bonus. If none arrives, show the working invitation/submission loop and label all sample bids as simulated.

## Build Order

1. **Validate the real-bid path early:** identify one concrete cleaning need and a willing provider; prepare the scope and request a quote once the buyer approves.
2. **Financial ingestion:** implement Rho, the normalized transaction model, and labeled recurring-spend fixtures.
3. **Opportunity detection:** vendor grouping, recurrence, annualized baseline, and explainable prioritization.
4. **RFQ and bid loop:** scope confirmation, invitation links, vendor form, bid persistence, and comparison arithmetic.
5. **Vendor discovery:** Tavily search/extraction, service-area fit, source links, and deduplication.
6. **Evidence checks:** entity matching and reputation first; other applicable sources as access permits.
7. **Approved email outreach:** delivery tracking, idempotent retries, and connection to the vendor response form.
8. **Demo polish:** real quote provenance, source labels, complete example, and failure states.
9. **Stretch:** Mercury, email-reply extraction, voice outreach, anonymous live underbidding, and more service categories.

The priority is completing the account → opportunity → RFQ → real quote → comparison loop.

## Success Criteria

- A real financial adapter works and exposes traceable transaction evidence.
- Recurring expenses are identified without counting transfers or duplicate imports.
- The user can confirm the service scope before publication.
- Discovery returns relevant providers with source evidence.
- Public checks distinguish matched facts, uncertain matches, and missing information.
- A provider can submit and revise a bid for the same scope.
- At least one actual business supplies a quote for the demo target.
- Savings calculations use comparable prices and make unknown costs visible.
- The buyer can explain why a shortlisted provider is attractive beyond its price.

## Scope Boundaries

**MVP:** one category, one service area, one financial integration, approved email invitations, private competitive bidding, evidence-backed comparison, and a genuine vendor quote.

**Later:** more banks and categories, a public marketplace, live reverse auctions, payment routing, contract execution, subscription or success-fee pricing, and savings tracking after switching.

**Removed from the prior plan:** equipment shopping lists, product-camera overlays, visual inventory audits, fly attention models, FlyHash, and asset management.

## Questions to Resolve During the Build

- Which actual business, service area, and cleaning scope will anchor the real quote?
- What account or sandbox access is available, and does it contain relevant recurring spend?
- Which public-data sources can be accessed reliably within the build window?
- Who can approve provider invitations and which email identity will send them?
- How much time and how many builders are available?
