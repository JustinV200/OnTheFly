# Phase 10 — Stretch

**Goal:** a parking lot. Nothing here is started until the spine ([00](00-foundations.md)–[06](06-counteroffer-comparison.md), [09](09-demo-polish.md)) is done and rehearsed.

**Depends on:** everything. **Critical path:** no.

The purpose of writing these down is to get them out of your head during the build. An idea in a list stops competing for attention with the loop that has to work.

## Ordered by value to the demo

### Shortlisting (the demo's end state)

Deferred from [09](09-demo-polish.md) under "Don't start new features here". The owner shortlists a challenger from the inbox: the listing moves to `shortlisted`, and the expense, listing, scope version, and offer are linked together, as [06](06-counteroffer-comparison.md) step 6 describes. Until it's built, the demo ends at the comparison and the presenter says the owner would shortlist there.

### Real authentication

Supabase Auth, real signup, real sessions. Seeded accounts plus a switcher demo *better* — the switch is the marketplace made visible — so this is worth less than it looks. Do it when the product outlives the hackathon.

### Fully identified public bidding

Open bidding ships in the MVP with challenger identities anonymized. A challenger who *wants* to be named — because winning publicly is marketing — could opt in per offer. Per-challenger, never owner-controlled: the whole reason identity is hidden is that the challenger bears the cost of revealing it.

### Live auction mechanics

Real-time updates, countdown timers, anti-sniping deadline extension, minimum decrements. The MVP's polling and fixed deadline prove the loop; these make it feel like an auction. Worth it only once listings routinely draw several challengers.

### Off-platform reply extraction

A provider emails a quote instead of using the form. Extract it with structured output into a challenge with provenance `captured from an off-platform response`, retaining the original message. The extracted amount keeps a reference to the evidence it came from. **An AI estimate is still not a counteroffer.**

This is the most likely real-world path, so it's the highest-value item here for an actual product.

### More categories

Landscaping, pest control, waste hauling, office coffee/water, copier servicing, managed IT, security. Each needs its own scope template and eligibility criteria — the schema work is per-category and doesn't generalize for free.

### Mercury and other connections

A second financial adapter through the same `TransactionSource` interface, plus structured CSV import for accounts with no API. Import is arguably more valuable than a second bank: it works for everyone.

### Savings tracking after a switch

The honest end of the loop. Confirm a switch happened, then watch subsequent transactions to show realized savings rather than potential ones. Turns the product's central claim from a projection into a measurement, and it's the foundation of any success-fee pricing model.

### Reputation from completed switches

Platform-native evidence that beats every external registry: this challenger won three listings and the owners stayed. Needs volume before it says anything, which is why it's here and not in [07](07-challenger-evidence.md).

### Benchmarking

"Businesses your size in your area pay $1,900–$2,600 for this." A natural byproduct of published listings and possibly the most defensible long-term reason to publish at all — you get the benchmark by contributing to it. Needs enough listings to be non-identifying, and needs care: aggregate figures computed from a handful of businesses can re-identify them.

### Voice and SMS outreach

ElevenLabs voice and SMS on the [08](08-outbound-invitations.md) path. Memorable in a demo, low product value, and every compliance constraint on email applies with more force.

### Public API for challengers

Let a provider's own system watch for listings matching its service area and capabilities. The right endgame for supply-side scale, far past the MVP.

## Explicitly not doing

Recorded so they don't come back as ideas:

- **Equipment shopping lists, product-camera overlays, visual inventory audits, asset management.** The first superseded concept. Its fruit-fly circuits (Compound Eye, Mushroom Body, FlyHash) were kept and now run on spend data. See [plan1.md](../plan/plan1.md#fly-brain-circuits).
- **Token-scoped private RFQ flows.** The second superseded concept. Invited challengers use the same public listing as everyone else.
- **A separate vendor account type.** One account type. A challenger is just another business.
- **Counteroffers public by default.** Open bidding ships, but as a toggle the owner turns on, defaulting off — and never retroactively.
- **Challenger identities visible to other challengers.** Cross-listing price surveillance is what makes providers stop bidding. Owner-only, in both modes.
- **Scraping beyond what's published for public business inquiry.**
- **A single "trustworthiness score."** Evidence is shown with its sources and gaps, never collapsed into a number that hides them.
