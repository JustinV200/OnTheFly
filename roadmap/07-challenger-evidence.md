# Phase 07 — Challenger evidence

> Status reconciliation — 2026-09-12: Only local evidence logic and registry stubs exist. USAspending supplier discovery/evidence is P0; Tavily enrichment is P1. The earlier optional-evidence priority below does not apply to the new demo's required public supplier evidence.
>
> Follow [the current P0/P1/P2 roadmap](README.md) and [current product plan](../plan/plan1.md). The earlier specification below is retained for reusable implementation detail. Its old priorities, demo category, and unchecked boxes are not a current completion report.

## Earlier component specification

**Goal:** show verifiable facts and honest gaps about whoever just offered to undercut the incumbent, with every claim traceable to a source and a timestamp.

**Depends on:** [05](05-marketplace-and-challenges.md). **Size:** L. **Critical path:** no — but it's what separates this from a price-comparison page.

The inbound design sharpens the motivation. A stranger you've never heard of has just offered to do your cleaning for 40% less. The question *who are they?* is the user's own first instinct, not something the product has to manufacture.

**This phase contains the only genuinely harmful failure mode in the product besides accidental publication.** Everything else is merely wrong; attaching a government exclusion or a safety violation to the wrong company is defamatory. Name similarity is common in local service businesses — "ABC Cleaning LLC" and "ABC Cleaning Services Inc." can be unrelated companies two towns apart. **Build the identity matcher before any adverse-record check.**

## Steps

### 1. Uniform check interface

`backend/app/services/evidence/check.py`. Every check returns the same shape, whatever its source:

| Field | Notes |
|---|---|
| `source` | Which registry or service, named specifically |
| `checked_at` | Timestamp of the lookup |
| `status` | `matched \| no match found \| uncertain \| not checked \| unavailable` |
| `match_confidence` | How the business was matched to the record |
| `result` | The finding |
| `limitations` | What this source does *not* cover |

`not checked` and `no match found` are **deliberately different values**. An unreachable source produces `unavailable`; a search that ran and found nothing produces `no match found`. Collapsing these into one "clear" state is the exact dishonesty the plan is written to prevent.

`limitations` is required. A state registry only knows about that state.

### 2. Identity matching — build this first

`backend/app/services/evidence/identity.py`. Match on legal name plus location plus any available identifiers, returning a confidence tier:

- **confirmed** — identifier-level match (registration number, exact entity plus address)
- **probable** — strong name and location agreement, no identifier
- **uncertain** — name similarity only
- **no match**

Then the hard rule:

> **Adverse records render only at `confirmed`.** Name plus city never attaches an exclusion, violation, or regulatory record to a business.

At `probable` or `uncertain`, the UI reports *"a possible match exists and needs review"* — never the record's contents as though they belong to this challenger.

**Never let a model establish identity.** Matching is deterministic, with identifiers. A model may summarize a finding; it may not decide two businesses are the same.

### 3. Platform evidence — the cheap win

`backend/app/services/evidence/platform.py`. Facts you already own, no external source required: account age, profile completeness, listings published, counteroffers made, whether they've been shortlisted before.

Build this first among the actual checks. It's free, it's always available, and in a young marketplace it's often the only signal — which is itself worth showing honestly ("new account, no history yet").

### 4. Entity registration — first external check

`backend/app/services/evidence/registry/`. The relevant state business registry: matched legal entity, status, formation date, source URL.

First because it produces the identifiers every other check matches against, and because a provider with no findable registration is itself a meaningful signal.

### 5. Reputation — second external check

`backend/app/services/evidence/reputation/`. Google Places or another accessible review source: rating, review count, source, and **recency**.

Label reviews as user-generated. A 4.8 from six reviews in 2019 is not a 4.8 from four hundred this year, and the UI should show the difference rather than a bare number.

### 6. Remaining sources, as access permits

SAM.gov exclusions and OSHA records. Both are adverse-record sources, so both are gated on `confirmed` identity from step 2.

Validate access before committing. A source unreachable within the build window renders as **not checked** with a note — an honest state, not a missing feature.

### 7. Insurance and licenses

Challenger-supplied documents: `supplied | checked | expired | unverified`. The MVP does not verify a certificate's authenticity, and the label must not imply it did.

### 8. Rollup and display

`backend/app/services/evidence/status.py`. Roll individual checks into the plan's labels: **checks complete for selected sources**, **needs review**, **information missing**.

**No blanket "verified" badge.** The rollup always names which sources it covers — that's the difference between a summary and a claim.

`frontend/src/features/evidence/` feeds both the challenger's profile page and the evidence column in [06](06-counteroffer-comparison.md)'s comparison.

Show unimplemented and unavailable checks as not run. Hiding them makes the completed checks look more comprehensive than they are.

### 9. Run checks in the background

Registries are slow and occasionally down. Run checks as jobs with per-check pending states rather than blocking the comparison on the slowest source.

## Done when

- [ ] Every check returns source, timestamp, confidence, result, and limitations.
- [ ] `not checked`, `unavailable`, and `no match found` are visibly distinct in the UI.
- [ ] Platform evidence shows for every challenger, including "new account, no history."
- [ ] Entity registration and reputation both work against real sources.
- [ ] An uncertain identity match **cannot** display an adverse record's contents.
- [ ] The rollup names which sources it covers.
- [ ] No screen shows a blanket "verified" badge.
- [ ] Unimplemented checks are listed as not run rather than omitted.

## Watch out for

- **Test the wrong-match case deliberately.** Point the matcher at two similarly named businesses and confirm the adverse record refuses to attach. It's the most important test in the phase.
- **"No results" is the most dangerous string here.** It must never reach the UI as reassurance.
- Don't let an adverse finding drive a score. Show the record, its source, its date, and its match confidence; let the owner judge.
- Don't apply evidence checks only to challengers. A challenger looking at *whose* expense they're countering is a symmetric question, and the same rollup answers it on the owner's profile.
- Don't block the inbox on a slow registry.
