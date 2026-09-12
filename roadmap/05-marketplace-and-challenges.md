# Phase 05 — Marketplace and challenges

**Goal:** a different account browses a feed of public listings, opens one, and submits a counteroffer that reaches the listing's owner — sealed by default, or into open bidding if the owner turned it on.

**Depends on:** [04](04-visibility-and-profiles.md). **Size:** L. **Critical path:** yes.

This phase closes the loop. Until a challenge can be submitted and received, everything before it is a spend dashboard with a publish button.

It also carries the product's second consent problem. [04](04-visibility-and-profiles.md) governs what the *owner* exposes about themselves; the open-bidding toggle governs what a *challenger* exposes — and the owner controls that switch. A challenger's price becoming public is material to them, so the same discipline applies: safe by default, disclosed before submission, never retroactive.

## Steps

### 1. The marketplace feed

`backend/app/api/marketplace/` and `frontend/src/features/marketplace/` — core screen 4.

A feed of public listings across all accounts, filterable by category and service area, sortable by amount and recency.

Built entirely from the phase-04 projection. The feed endpoint has **no access to private models** — same enforcement as the profile page. One shared path to public data means one place to audit.

Exclude the acting account's own listings from their feed, or mark them clearly. Seeing your own listing among things you could challenge is confusing.

### 2. Listing detail

The full scope, the current price and cadence, the challenge deadline if any, how many challenges have been received, a link to the owner's profile, and **the bidding mode, stated plainly**.

**Never shown:** who else has challenged. Challenger identity is private to the owner in both modes.

**Offer amounts** depend on the mode — hidden when sealed, shown on a leaderboard when open (step 4).

Responsive matters here specifically. A cleaning company owner will open this on a phone, possibly from a link someone sent them, and it's the first screen of yours they'll ever see.

### 3. Bidding mode — the toggle that makes it an auction

`backend/app/services/listings/bidding_mode.py`.

A per-listing toggle, **default off**, owned by the listing's owner:

| Toggle | Other challengers see | Owner sees |
|---|---|---|
| **Off — sealed** (default) | Offer count only | Everything |
| **On — open bidding** | Every offer's price and scope, anonymized | Everything, including identities |

Four rules, all of which need code rather than good intentions:

1. **Sealed is the default and the fallback.** Unset, ambiguous, or errored resolves to sealed — same structural discipline as expense visibility in [04](04-visibility-and-profiles.md).
2. **Identity is never public in either mode.** Prices go public in open bidding; who offered them does not. A challenger able to watch competitors' rates accumulate across listings learns their whole pricing structure, which is both a real harm and a reason providers would stop using the platform.
3. **A mode change never applies retroactively.** Store the mode in force **on each offer at submission**. Turning open bidding on publishes offers submitted afterward; earlier sealed offers stay sealed, still count toward the total, and remain fully visible to the owner. Offer their challengers an opt-in to publish. Deriving publicity from the listing's *current* mode is the bug this rule exists to prevent — it retroactively exposes a price someone gave you in confidence.
4. **The mode is disclosed before submission** — on the listing detail and again in the challenge form.

An owner cannot bid on their own listing. Enforce in the service, not the UI.

### 4. The public leaderboard

When open bidding is on, the listing detail shows the standing offers, anonymized: rank, price normalized to a common period, **scope completeness**, and submission time.

**Never rank on bare price.** A price-only leaderboard teaches challengers that the cheapest way to climb is to quietly offer less, which corrodes exactly the comparison the product exists to make. Show what each offer covers next to what it costs — reuse the scope-delta computation from [06](06-counteroffer-comparison.md) rather than writing a second one.

Polling refreshes the leaderboard during the demo; outbound notifications are outside the hackathon scope.

### 5. The challenge form

`frontend/src/features/challenge/`. Submitted against a specific **scope version**:

- Price, currency, billing frequency
- Included scope, exclusions, optional extras
- Setup fees, taxes, supplies, minimum term, other conditions
- Availability, offer expiry, whether a site visit is required
- Supporting documents
- A message to the owner

The challenger's identity comes from their acting account — they already have a profile, which is what phase 07's evidence attaches to. No separate vendor registration, no token links.

**State the bidding mode in the form itself**, next to the price field: *"This listing uses open bidding — your price and scope will be visible to other challengers. Your identity will not."* A challenger should never be surprised by what they revealed.

### 6. Challenge model and revisions

`backend/app/models/challenge.py`, `backend/app/services/challenges/`:

- A challenge belongs to `(listing, scope_version, challenger_account)`.
- **`bidding_mode_at_submission` is stored on the offer** and is what governs its publicity — never the listing's current mode. This is the field that makes a later toggle non-retroactive.
- The challenger may revise **their own** offer until the deadline; **every revision is retained**. A revision made under a different mode records the mode in force at that revision.
- Submissions after the deadline, or to a closed or unpublished listing, are rejected with a clear message — never silently accepted.
- One active offer per challenger per listing. A second submission is a revision, not a duplicate.
- An owner submitting on their own listing is rejected.
- **Provenance is required:** `challenger-submitted`, `captured from an off-platform response`, or `demo data`. This is how phase 01's genuine counteroffer stays distinguishable from sample data.

### 7. Access rules

Worth stating explicitly, because this is where a multi-account product leaks:

| Who | Can see |
|---|---|
| Anyone, no account | Public listings and profiles; the leaderboard where bidding is open |
| A challenger | Their own offers, every public listing, and other offers' **amounts** where bidding is open |
| A listing owner | Every challenge on their listing, in full, with identities |
| Nobody but the owner | Any challenger's identity |
| Nobody but the owner | Amounts of offers submitted while bidding was sealed |

Write these as tests. They're cheap now, and they're exactly the rules a judge will try to break by clicking around.

The trickiest one is the last: a listing that has been sealed *and* open over its life has offers in both states at once, and the leaderboard must show only the ones submitted while open.

### 8. The unpublish interaction

Decide and implement what happens to live challenges when a listing is unpublished. Recommended: challenges are **retained and remain visible to the owner**, the listing stops accepting new ones, and challengers see it as closed rather than vanished.

A challenger who spent ten minutes writing an offer and finds it silently deleted will not come back.

## Done when

- [ ] A second account sees the published listing in the feed.
- [ ] A listing defaults to sealed, and its mode is stated on the detail page and in the challenge form.
- [ ] A submitted counteroffer reaches the owner's view.
- [ ] With bidding sealed, no challenger can see another's amount by any route, including a guessed ID.
- [ ] With bidding open, the leaderboard shows amounts and scope completeness, and no identities.
- [ ] **Turning open bidding on does not publish an offer submitted while it was sealed.**
- [ ] A challenger's identity is invisible to other challengers in both modes.
- [ ] Being outbid notifies the challenger.
- [ ] A revision replaces the active offer and both versions are retained.
- [ ] Past-deadline, closed-listing, and unpublished-listing submissions all fail gracefully.
- [ ] An owner cannot bid on their own listing, including by direct API call.
- [ ] Every challenge carries provenance and the mode in force at submission.
- [ ] The whole flow works on a phone, on cell data, from a cold link.

## Watch out for

- **The retroactive-publish bug is the one to hunt.** Submit an offer while sealed, turn open bidding on, and confirm that offer stays hidden. It's a one-line mistake — reading the listing's current mode instead of the offer's stored one — and it exposes a price someone gave you in confidence. Write this test before the feature.
- **Test as a stranger, on a phone, on cell data.** Not localhost, not your logged-in browser. The listing page is the one screen someone outside your team will actually use.
- **Don't build a separate vendor account type.** One account type is settled. A challenger is just another business.
- **Don't default to open.** The exciting mode is not the safe one, and the safe one has to be what happens when nobody chose.
- **Don't rank the leaderboard on bare price.** It converts the product from a comparison tool into a race to under-scope.
- **Don't publish identities to make the leaderboard feel livelier.** Anonymity is what keeps providers willing to bid at all.
- Don't skip revision history because the demo submits once. Retrofitting versioning into a live table is unpleasant.
- Don't let a challenge outlive its scope version. If the owner edits scope, existing offers stay attached to the version they answered, and the UI says which.
