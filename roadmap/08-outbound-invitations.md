# Phase 08 — Outbound invitations (secondary path)

> Status — 2026-09-13 (merged to `main` with the Invite suppliers page and the public opt-out page): the secondary path is implemented behind safe defaults. Still not critical path; manual sharing of the listing remains enough for the demo.
>
> **Implemented and covered by backend tests**
> - Discovery behind `services/discovery/source.py`. Default `DISCOVERY_SOURCE=fixture` returns fictional, labeled demo providers (`.example` domains) including one aggregator and one duplicate. `tavily` runs a real web search only with `TAVILY_API_KEY`. Without a key the run is recorded as not run; an HTTP failure is recorded as an error. Neither falls back to demo data.
> - Queries come from the stored public projection (category, area, tasks, frequency), never the incumbent. Aggregators are dropped, and duplicates merge deterministically by domain, phone and name. Every candidate stores its source, source URLs and `retrieved_at` (null only for a manual addition). Each run is stored with its counts.
> - Durable `provider_candidates` records, discovered or manually added, with per-candidate eligibility reasons. A provider marked `contacted_off_platform` can't be invited automatically.
> - Approval gate: the owner previews every recipient and the exact rendered message, and approval must echo the preview hash. The approval records who, what and when. Discovery, adding candidates, publishing, seeding and jobs never create or send invitations.
> - Template compliance is part of the render. It sets accurate From/To/Subject and `List-Unsubscribe`, adds the platform's postal address line (`OUTREACH_POSTAL_ADDRESS`; the footer says when it is missing) and a per-recipient opt-out link. Content is only the public listing projection plus the owner's public name and profile link. The incumbent is never named. The listing link is the ordinary public URL with no token.
> - Channels: `OUTREACH_CHANNEL=sandbox` (default) stores messages in `sandbox_outbox`, and no email leaves the machine. `smtp` sends only to `OUTREACH_RECIPIENT_ALLOWLIST`, and approval is refused until the postal address, a non-`.example` From address and `SMTP_HOST` are set.
> - Idempotent queue (`workers/outreach/`): one invitation per `(listing_id, provider_candidate_id)`, enforced by a unique constraint. Each send starts with an atomic `queued → sending` claim committed before sending. Transient failures back off (30s, 120s) and fail after 3 attempts. A row left in `sending` by a crash is never retried automatically. Opt-outs are checked at preview and again at send time.
> - Per-invitation status `queued | sending | sent | failed | suppressed`, plus `challenged` attributed by exact account contact-email match after the send, never a tracking token. There are opt-out describe/apply endpoints and a `python -m app.cli.process_outreach` CLI.
>
> **Not built or not verified**
> - `delivered`, `opened` and `bounced` need provider webhooks, which are not built. The overview reports `delivery_tracked: false`.
> - SPF/DKIM for a real sending domain is a deployment task and is not done.
> - Tavily has only been exercised against mocked HTTP. No real key has been used, so "5–10 real candidates" is unproven.
> - Service-area and scope-fit checks (step 3) are not implemented; the owner judges fit from the capability summary and sources.
> - No real email has been sent through the SMTP channel.
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

Ticked boxes are proven by backend tests (`backend/tests/outreach/`) as of 2026-09-13; the UI is not built.

- [ ] Discovery returns 5–10 real candidates with source URLs and retrieval timestamps. *(Fixture discovery returns 6 fictional candidates with both; Tavily is tested only against mocked HTTP.)*
- [x] Aggregators are filtered and duplicates collapse to one candidate.
- [x] Manually added providers sit alongside discovered ones.
- [x] Nothing sends without an explicit approval action showing the rendered message.
- [x] Processing the queue twice produces exactly one delivery per recipient.
- [x] The template carries accurate headers, a postal address, and an opt-out. *(The postal address comes from `OUTREACH_POSTAL_ADDRESS`; real sending is blocked until it is set.)*
- [x] An invitation links to the public listing, not a private flow.
- [ ] Delivery, failure, and challenge states are visible per provider. *(Sent, failed, suppressed and challenged are visible; delivered needs provider webhooks.)*

## Watch out for

- **Use a sandbox or a whitelist until the approval gate is proven.** Everyone who has built an outreach queue has, at least once, mailed a test batch to real people.
- **Don't auto-send on publish**, however natural the flow feels. Publishing and inviting are separate actions with separate consent.
- **Don't rebuild the private RFQ.** If an invited provider is getting a different page, a scoped token, or a form the public doesn't have, stop — that's the superseded design creeping back.
- **If phase 01's providers were already contacted by hand, don't re-invite them through the system** without saying so. An automated duplicate after a human conversation reads as spam and can cost you the real counteroffer.
- Cache search results during development. Re-running discovery on every reload burns quota and makes the filter irreproducible when you're debugging it.
- Don't scrape anything not published for public business inquiry.
- Voice and SMS are stretch. Not here.
