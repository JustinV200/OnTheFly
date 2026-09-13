# Phase 01 — Real-counteroffer path (human track)

> Status reconciliation — 2026-09-12: A genuine external quote is now an optional bonus. The full demo needs a submitted challenge, which can be labeled demo data. The earlier hour-zero critical-path requirement and quote deadline below no longer govern the build.
>
> Follow [the current P0/P1/P2 roadmap](README.md) and [current product plan](../plan/plan2.md). The earlier specification below is retained for reusable implementation detail. Its old priorities, demo category, and unchecked boxes are not a current completion report.

## Earlier component specification

**Goal:** one genuine counteroffer, from one real business, against one concrete listed expense — obtained in parallel with the build, not after it.

**Depends on:** nothing. **Size:** S in effort, longest in latency. **Critical path:** yes — **start at hour zero**.

Almost none of this is code. It is the phase most likely to be postponed and the only one whose latency you cannot compress by working harder. A real business replies on its own schedule.

The plan's success criteria include *"at least one actual business supplies a genuine counteroffer."* This phase is that criterion.

**The inbound design makes this harder and better.** In an outbound product you email a stranger a form. Here, the ideal version is a real provider who comes to the platform, sees a listing, and counters it — which is a dramatically stronger demo and a slower ask. Plan for both outcomes from the start (step 5).

## Steps

### 1. Pick the concrete expense

Not a hypothetical. An actual place with an actual cleaning need: a real address, real square footage, real visit frequency, a real bathroom count. A teammate's office, a small business someone knows, a campus space with a facilities contact.

Record it in `roadmap/notes/real-expense.md` (gitignore it if it holds anything private).

### 2. Confirm the owner is willing to publish

Someone has to be the business whose expense goes public. This is a bigger ask than the old outbound version — you're asking them to let a price they pay become visible on a platform, not just to receive quotes.

Confirm explicitly:

- they're willing to have the price and scope public,
- whether the **incumbent vendor's name** may be shown (default: no — it discloses a third party's pricing and may be contractually restricted),
- that they're willing to receive and read counteroffers.

Without this, you're publishing someone's commercial terms without consent. Get it in writing, even informally.

### 3. Write the scope by hand, before building the publish flow

Write the listing as prose, by hand, for this specific expense:

- Service area and approximate location
- Square footage, visit frequency, bathroom count
- Required tasks and quality expectations
- Supplies, equipment, and taxes — included or not
- Insurance or other requirements
- Desired start date, minimum term, cancellation constraints
- Current price and billing cadence
- Whether there's a deadline for counteroffers

**This hand-written document is the specification for phase 04's `ScopeVersion` schema.** Writing it first means the schema is derived from a description a real provider actually understood, rather than guessed at in the abstract. Don't skip the ordering.

Show it to one real cleaning company and ask whether they could quote from it. Their questions are your missing fields.

### 4. Approach 3–5 real providers

By hand — search, phone, email, whatever works. Don't wait for phase 08's discovery; that exists to scale this, not to start it.

Be straightforward: you're building a platform where businesses publish what they pay and competitors can counter, you have a real listing, and you'd like a real counteroffer. Sending from a real, monitored identity with accurate details and an easy way to decline.

### 5. Pursue both outcomes, in this order

**Best:** a provider creates an account, browses to the listing, and submits a counteroffer through the product. Genuine data through the real path, and a demo that shows the loop actually working with a stranger in it.

**Acceptable:** a provider gives you a real quote off-platform — email, phone, in person. You enter it with provenance `captured from an off-platform response`, keeping the original.

The second is a real result honestly labeled, not a failure. Don't let the pursuit of the first cost you the second — ask for the quote, then invite them to the platform.

### 6. Set and record the cutoff

Pick a wall-clock time after which you stop expecting a real reply and the demo runs on labeled-simulated offers. Write it into [README.md](README.md) where the placeholder is.

The cutoff exists so the decision is made calmly in advance rather than frantically during rehearsal. Hitting it isn't failure — the fallback is to show the working publish-and-challenge loop with every sample offer clearly labeled.

### 7. Capture whatever comes back, verbatim

Record: business name, amount, billing frequency, inclusions and exclusions, setup fees, minimum term, offer expiry, whether a site visit is required, and the **actual timestamp**.

Keep the original message. A displayed offer retains its original evidence, so the original has to still exist.

### 8. Load it as real data, not a hardcoded string

When phase 05 exists, the genuine counteroffer enters through the same path a challenger would use, carrying its true provenance. A real quote typed into a fixture is indistinguishable from a fake one, which wastes the entire point of this phase.

## Done when

- [ ] A specific expense, location, and scope are written down.
- [ ] The owner has approved publication, including the incumbent-name decision.
- [ ] At least three real providers have been approached.
- [ ] One real provider has read the scope and confirmed it's quotable.
- [ ] The cutoff time is recorded in the roadmap README.
- [ ] At least one genuine counteroffer is captured with its original evidence and real timestamp.

## Watch out for

- **Don't publish before step 2.** Owner consent precedes publication, always — and that rule applies to a human pasting a scope into a form just as much as to the product's toggle.
- **Don't inflate the response.** If a provider says "probably around $1,900, depends on a walkthrough," that's what's displayed, hedge intact.
- If nothing arrives before the cutoff, label every offer simulated **in the UI**, not just in the spoken demo. A judge reading the screen should see it without being told.
- Resist presenting a hand-captured quote as though it came through the platform. "We sent this by hand, here's the real reply" is more convincing than a smooth fiction, and far more survivable under questioning.
