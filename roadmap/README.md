# Roadmap

Build order for the public-spend-profile marketplace described in [../plan/plan1.md](../plan/plan1.md). The plan says *what* and *why*; this folder says *in what order* and *done when*.

One file per phase. Work them in numeric order, with the exception noted below.

| # | Phase | Depends on | Size | On critical path |
|---|---|---|---|---|
| [00](00-foundations.md) | Foundations, identity, deploy skeleton | — | M | Yes |
| [01](01-real-counteroffer-path.md) | Real-counteroffer path (human track) | — | S | **Yes — start hour zero** |
| [02](02-financial-ingestion.md) | Financial ingestion | 00 | L | Yes |
| [03](03-expense-dashboard.md) | Expense dashboard | 02 | M | Yes |
| [04](04-visibility-and-profiles.md) | Visibility and public profiles | 03 | L | Yes |
| [05](05-marketplace-and-challenges.md) | Marketplace and challenges | 04 | L | Yes |
| [06](06-counteroffer-comparison.md) | Counteroffer comparison | 05 | M | Yes |
| [07](07-challenger-evidence.md) | Challenger evidence | 05 | L | No |
| [08](08-outbound-invitations.md) | Outbound invitations (secondary path) | 05 | M | No |
| [09](09-demo-polish.md) | Demo polish | all | M | Yes |
| [10](10-stretch.md) | Stretch | all | — | No |

Sizes are relative to each other, not hour estimates — team size and window are still open questions.

## Two tracks, both starting immediately

**Phase 01 is not code and does not wait its turn.** Getting a genuine counteroffer from a real business is the longest-latency item in the project and the one you control least. It starts before the first line of code and runs in the background through every other phase. Starting it on day two is how the demo ends up with only simulated offers.

Everything else is sequential: `00 → 02 → 03 → 04 → 05 → 06 → (07, 08) → 09`.

## The spine

Phases 00 through 06, plus 09, are the product. The loop closes without 07 and 08:

- Without **challenger evidence (07)**, you see a counteroffer but not who's behind it.
- Without **outbound invitations (08)**, nobody gets nudged to come look at a listing.

That ordering is deliberate. Build the loop that closes — publish, browse, challenge, compare — then make it good. Evidence checks attached to a marketplace nobody can post to demo nothing.

## Minimum demo path

If the schedule collapses, this is the smallest sequence that still shows the actual idea:

1. Import transactions (fixture source is fine, labeled as such).
2. Show the dashboard with everything private.
3. Toggle one expense public, confirm scope, preview the payload, publish.
4. Switch accounts, find the listing in the feed, submit a counteroffer.
5. Switch back, see it, compare against the current price.

That is phases 00, 02, 03, 04, 05, 06. Everything else is additive.

## Cut order

When time runs short, cut from the bottom up. Decide now, not at 3am:

1. **10** — all stretch items.
2. **08** — outbound invitations. Tell a challenger about a listing by messaging them yourself.
3. **07** — evidence sources beyond identity matching. Show unimplemented checks honestly rather than hiding the column.
4. **03's** suggestion ranking. Show all expenses unranked; the owner picks what to publish anyway.

**Never cut:** the visibility toggle's private-by-default behavior, the publish preview, the challenge submission path, the comparison arithmetic, or the provenance labels.

Open bidding ([05](05-marketplace-and-challenges.md) steps 3–4) is cuttable — sealed offers still close the loop. If it's cut, cut the toggle too. A toggle that doesn't work is worse than no toggle.

## What must never regress

Two defaults carry the product's promises, and neither is trimmable under time pressure:

- **Expenses are private until the owner publishes them.** If a shortcut would make an expense public through any path the owner didn't explicitly take, the shortcut is wrong, however late it is.
- **Offers are sealed unless the owner opened bidding *before* they were made.** Publicity is read from the mode stored on the offer, never from the listing's current mode.

Both are the difference between a marketplace and a leak, and both fail silently — which is why they need tests rather than care.

## Decisions already made

Settled, so they don't get relitigated mid-build:

- **One account type.** Every account is a business that both publishes its own expenses and challenges others'. No buyer/vendor role split.
- **Seeded demo accounts plus an in-app switcher.** No signup, no passwords, no auth flows. Real auth is post-MVP.
- **Counteroffers are sealed by default**, with only a count shown publicly. **Open bidding is a per-listing toggle, default off**: turning it on publishes offer amounts and scope so challengers can underbid. Challenger identities stay private to the owner in both modes, and turning the toggle on never retroactively publishes an offer made while it was off.
- **Outbound discovery and invitation are a secondary path** for seeding supply, subordinate to the public loop. An invited challenger lands on the same public listing as everyone else.

## Decisions to lock before phase 02

- **Which real business and cleaning scope anchors the genuine counteroffer**, and will they create an account or respond off-platform? Blocks phase 01.
- **What Rho sandbox access exists, and does it contain recurring service spend?** Blocks the phase 02 spike. If not, fixtures become the demo path and the pitch says so out loud.
- **What is the cutoff after which the demo runs on labeled-simulated offers?** Pick a wall-clock hour and write it here:

  > Real-counteroffer cutoff: `TBD — fill this in`

- **How many builders, and for how long?** Determines whether 07 and 08 are realistic at all.

## Conventions every phase assumes

From [../CLAUDE.md](../CLAUDE.md), repeated because they shape the steps and not just the code:

- Private is the default and the fallback. Everything imports private.
- The public projection is built explicitly, field by field — never filtered down from the private record.
- Money is integer minor units plus a currency, computed in deterministic code.
- Every record carries provenance: `production | sandbox | imported | fixture` for financial data, `challenger-submitted | captured from an off-platform response | demo data` for offers.
- An unavailable source is *not checked*; an empty result is *no match found in this source*.
- AI drafts and extracts. It does not calculate, and it does not decide what's public.
