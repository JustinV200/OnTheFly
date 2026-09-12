# Phase 09 — UI modernization and demo polish

**Goal:** the product looks and behaves like a credible modern financial marketplace, and the full loop runs end to end in front of people without a rescue — with every number traceable to its source.

**Depends on:** everything. **Size:** L. **Critical path:** yes.

This phase includes a focused visual redesign as well as provenance, privacy proof, failure states, and rehearsal. The visual reference is Robinhood's clarity around money and actions plus Supabase's structured, restrained dashboard feel. Copy neither product's branding or layouts; use them as a quality bar for hierarchy, density, responsiveness, and interaction feedback.

## Steps

### 1. Establish the visual system and application shell

Define shared tokens for color, typography, spacing, radius, borders, shadows, motion, and responsive breakpoints. Use tabular numerals for money and reserve status colors for meaningful states.

Build reusable primitives for buttons, inputs, selectors, badges, metric blocks, tables, cards, dialogs, drawers, tabs, skeletons, empty states, error banners, and toasts. Then build one persistent responsive shell containing product identity, primary navigation, current-business switcher, and connection status.

Include a favicon and basic page metadata. Verify keyboard focus, contrast, and phone-width navigation before applying the system to feature screens.

### 2. Redesign the five core screens

Apply the system to the expense dashboard, publish flow, public profile, marketplace/listing experience, and challenge comparison. Keep money, privacy state, provenance, bidding mode, and scope completeness visually prominent.

Desktop should support dense spend review without feeling crowded. Mobile should prioritize browsing listings, reading scope, and submitting a challenge. Every screen must define loading, empty, error, success, and disabled states; a blank white screen or indefinite plain-text loader fails this step.

### 3. Provenance audit — every screen, every number

Walk every screen and confirm each figure and claim shows its origin: `production | sandbox | imported | fixture` for financial data, `challenger-submitted | captured from an off-platform response | demo data` for offers, source plus timestamp for evidence.

Anything unlabeled is a bug. This is the highest-value hour in the phase, because it's exactly what a skeptical judge probes.

### 4. The privacy proof

Rehearse the answer to *"what stops someone publishing their whole account by accident?"* as a **demonstration**, not a sentence:

- Show the dashboard with everything private by default.
- Show the preview rendering the actual public payload.
- Open the public profile in a logged-out window, side by side, showing only the one published listing.
- Unpublish, and refresh the public window to show it gone.

That sequence takes forty seconds and answers the product's hardest question better than any slide. Practice it as a unit.

### 5. Demo reset command

`backend/app/cli/seed_demo.py` — one command that drops to a known state and reseeds accounts, transactions, and any demo listings. You will run this more than once, and a half-mutated database between attempts is how a working product looks broken.

Reset must **not** destroy the genuine counteroffer from phase 01. Seed it back with its real provenance and timestamp.

### 6. Failure and empty states

Every screen needs its unhappy paths, because someone will hit one:

- No connection yet / import running / import failed
- Dashboard with no expenses
- A listing with no challenges yet — the most common state in a young marketplace, so make it look intentional
- Marketplace feed with nothing in the chosen category
- Expired deadline, closed listing, unpublished listing
- An open-bidding listing with one offer, where there's no competition to display yet
- Evidence check unavailable or still pending
- A challenger viewing a listing that was unpublished, or whose bidding mode changed, while they were writing

An unstyled error is survivable. A blank white screen is not — nobody can tell whether it's broken or loading.

### 7. Honest labeling of the demo's seams

Two things get said on screen, not just aloud:

- **If Stripe's sandbox data has no recurring service spend matching the demo**, that expense comes from fixtures. Label both sources, and volunteer the distinction in the pitch. Offering it reads as rigor; being caught at it reads as the opposite.
- **If no genuine counteroffer arrived before the cutoff**, every sample offer is labeled simulated in the UI. The working publish-and-challenge loop is still the real accomplishment.

### 8. The account switch as a demo instrument

The strongest minute you have is switching accounts mid-demo: publish as one business, become another, find the listing in the feed, counter it, switch back, see it arrive. Then flip on open bidding, become a third business, and underbid — the leaderboard moving in front of the audience is the moment the product reads as a marketplace rather than a form.

Rehearse it until the switching is invisible and the *bidding* is what people notice. Make sure the switcher is legible on a projector — the current account must be unmistakable at a glance, or the audience loses the thread of who's doing what.

Seed the accounts so this works: one owner with spend, and at least two plausible challengers.

### 9. The real counteroffer, front and centre

If phase 01 delivered: show the actual amount, actual terms, actual timestamp, and say whether it came through the platform or was captured off it. One genuine offer from one real business is worth more than a screen of plausible fakes, and most teams won't have one.

### 10. Walk the plan's demo script on deployed infrastructure

The ten-step script in [../plan/plan1.md](../plan/plan1.md). Rehearse it **deployed**, not on localhost. Then rehearse again on hotel wifi or tethered — conference networks are hostile, and a demo that needs a fast connection often doesn't get one.

### 11. Trace one number all the way down

Pick the headline savings figure and click from it through the offer, the scope version, the listing, the expense, the annualized baseline, and finally the individual transactions. Any missing link gets fixed — that chain *is* the product's claim to credibility.

### 12. Pre-demo checklist

Write it down here and run it before presenting:

- [ ] Deployed API healthy
- [ ] Deployed frontend reaching it
- [ ] Demo data reseeded
- [ ] Public profile opened in a logged-out window, on a phone, on cell data
- [ ] Genuine counteroffer present with correct provenance
- [ ] Account switcher visible and legible on the projector
- [ ] Every screen loads from a cold session
- [ ] A backup recording exists, in case the network dies entirely

## Done when

- [ ] The five core screens use one coherent component system and responsive application shell.
- [ ] Money, privacy, provenance, bidding mode, and scope completeness have clear and consistent hierarchy.
- [ ] Desktop and phone layouts have been checked, including keyboard focus and contrast.
- [ ] The browser tab has a favicon and intentional product metadata.
- [ ] The full script runs deployed, cold, without intervention.
- [ ] Every figure on screen shows its provenance.
- [ ] The privacy proof runs in under a minute and is rehearsed.
- [ ] Every screen has a defined empty and error state.
- [ ] One command resets to a clean demo state without losing the real counteroffer.
- [ ] The headline number traces back to individual transactions in the UI.
- [ ] The pre-demo checklist is written and has been run end to end once.

## Watch out for

- **Don't start new features here.** Anything not already working goes to [10](10-stretch.md). Adding one more evidence source the hour before presenting has ended more demos than it has improved.
- Don't rehearse only the happy path. Rehearse the questions: "where did that number come from," "what stops an accidental publish," "is that real data," "what if nobody challenges."
- Don't demo from localhost. Public reachability is a feature — show a stranger's view of the profile.
- Don't remove the simulated labels. If a judge finds one thing overstated, they discount everything else you said.
- Don't let the account switcher look like an admin tool. Framed right, it's "here's the other side of the marketplace."
