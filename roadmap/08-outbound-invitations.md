# Phase 08 — Outbound invitations (secondary path)

> Status reconciliation — 2026-09-12: Invitation API/service stubs exist; delivery does not. Automated outreach is deferred. Manual sharing of the existing listing is sufficient. The earlier email-provider work below is a future reference, not hackathon critical-path work.
>
> Follow [the current P0/P1/P2 roadmap](README.md) and [current product plan](../plan/plan1.md). The earlier specification below is retained for reusable implementation detail. Its old priorities, demo category, and unchecked boxes are not a current completion report.

## Earlier component specification

**Goal:** seed the supply side. Find real providers in the category and service area, and — with the owner's explicit approval — invite them to come challenge a listing.

**Depends on:** [05](05-marketplace-and-challenges.md). **Size:** M. **Critical path:** no.

This is the answer to the cold-start problem. Inbound only works if someone is browsing, and on day one nobody is. Outbound exists to put the first challengers in the room, then get out of the way.

**It is strictly secondary.** An invited challenger lands on the same public listing every other user sees. There is no private RFQ, no token-scoped parallel flow, no separate vendor experience. If you find yourself building one, the design has drifted.

## Steps

### 1. Discovery behind an interface

`backend/app/services/discovery/source.py` for the protocol, `backend/app/services/discovery/tavily/` for the implementation. Nothing else imports Tavily directly.

Not ceremony: search providers rate-limit, change output shape, and fail during demos. A seam lets you drop in a cached fixture for rehearsal without touching callers.

### 2. Query construction from the listing

`backend/app/services/discovery/query.py`. Build searches from the listing's category, service area, and confirmed scope — not from the incumbent's name. You want competitors, not the incumbent.

Run several query shapes; one phrasing returns one slice of the market.

### 3. Extract and filter

For each candidate, collect business name and legal entity where available, website and the specific source URLs, service coverage, contact details **published for inquiries**, and capability claims relevant to the scope.

**Record `retrieved_at` on everything.** Public web content changes; a claim with no retrieval time is uncitable.

Then filter hard:

- **Drop aggregators and directories.** A page listing twenty cleaning companies is not a cleaning company, and search results for local services are dominated by them.
- **Deduplicate** across domain, name, and phone. The same provider appears under many listings.
- **Check service-area and scope fit.** A residential-only cleaner isn't a candidate for 8,000 sq ft commercial.

Target 5–10 relevant providers. Breadth isn't the metric; whether they can quote the job is.

### 4. Persist candidates

`backend/app/models/provider_candidate.py`. A durable record, not a transient search result — the owner reviews it, invites it, and the demo needs it stable across a reload.

Mark how each was found: `discovered` or `manually added`. Manual addition stays available in the UI; phase 01's real providers were found by hand and belong in the same list.

### 5. The approval gate

`frontend/src/features/invitations/`. Before anything sends, the owner sees the full recipient list, the exact rendered message, and which listing it points to. Approval is one explicit action.

From [../CLAUDE.md](../CLAUDE.md): editing a plan, seeding data, or running a job does not authorize outreach. Nothing sends on publish, on discovery completion, or on any automatic trigger. A human clicks, every time.

Record who approved, what exactly, and when.

### 6. Message template with compliance built in

`backend/app/services/outreach/templates/`. The invitation identifies the requesting business, describes the job in the listing's own terms, and links to the **public listing URL**.

Commercial email requires accurate headers, a real physical postal address, and a working opt-out. These are properties of the **template**, not of the approval step — an owner approving a non-compliant message doesn't make it compliant. Build them in so they can't be omitted.

Never include anything the listing itself doesn't show. The invitation is a pointer to public information, which keeps the disclosure question already answered by phase 04.

### 7. Job queue with idempotency

`backend/app/workers/outreach/`. Idempotency key: `(listing_id, provider_candidate_id)`. One send attempt per key, ever.

Requeues, retries, restarts, and double-clicks are all no-ops. **Test by processing the same queue twice and confirming one delivery.** Sending a real business the same invitation four times is what makes providers stop replying, and it's embarrassing in front of judges.

Retries use backoff and cap out. A permanently failing address becomes a visible failed state, not an infinite loop.

### 8. Delivery tracking

States: `queued → sent → delivered → opened → challenged`, plus `failed` and `bounced` with reasons.

The owner's view shows status per invited provider. This is what makes the story legible: "four invited, three delivered, one challenged."

Verify sending-domain authentication (SPF/DKIM). Cold B2B email from an unauthenticated domain lands in spam, and a demo where the invitation silently never arrived looks identical to one where the code was broken.

### 9. Attribution

A challenge arriving from an invited provider marks that invitation `challenged`. Attribution is by account, not by a tracking token — the challenger signed in and used the public listing like anyone else.

## Done when

- [ ] Discovery returns 5–10 real candidates with source URLs and retrieval timestamps.
- [ ] Aggregators are filtered and duplicates collapse to one candidate.
- [ ] Manually added providers sit alongside discovered ones.
- [ ] Nothing sends without an explicit approval action showing the rendered message.
- [ ] Processing the queue twice produces exactly one delivery per recipient.
- [ ] The template carries accurate headers, a postal address, and an opt-out.
- [ ] An invitation links to the public listing, not a private flow.
- [ ] Delivery, failure, and challenge states are visible per provider.

## Watch out for

- **Use a sandbox or a whitelist until the approval gate is proven.** Everyone who has built an outreach queue has, at least once, mailed a test batch to real people.
- **Don't auto-send on publish**, however natural the flow feels. Publishing and inviting are separate actions with separate consent.
- **Don't rebuild the private RFQ.** If an invited provider is getting a different page, a scoped token, or a form the public doesn't have, stop — that's the superseded design creeping back.
- **If phase 01's providers were already contacted by hand, don't re-invite them through the system** without saying so. An automated duplicate after a human conversation reads as spam and can cost you the real counteroffer.
- Cache search results during development. Re-running discovery on every reload burns quota and makes the filter irreproducible when you're debugging it.
- Don't scrape anything not published for public business inquiry.
- Voice and SMS are stretch. Not here.
