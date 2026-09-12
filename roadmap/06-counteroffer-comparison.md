# Phase 06 — Counteroffer comparison

**Goal:** the owner opens their challenge inbox and can tell, quickly and honestly, whether any of these offers is actually better than what they pay now.

**Depends on:** [05](05-marketplace-and-challenges.md). **Size:** M. **Critical path:** yes.

The arithmetic here is the product's actual claim. Every other phase moves data around; this one makes an assertion about money, and it has to be one that survives someone checking it.

## Steps

### 1. Normalize before ranking

`backend/app/services/comparison/normalize.py`. Offers arrive with different billing frequencies, inclusions, and fee structures. Convert to a common period in `Money` before anything is ordered.

**Surface scope differences before price.** An offer covering two visits a week against a three-visit scope is not cheaper — it's a different service, and ranking it first is the product lying to its user. The comparison's first job is to say *these are not the same thing*, and only then to say which costs less.

Compute a scope delta against the listing's scope version: what's missing, what's added, what's unstated.

**This computation is shared with the public leaderboard** in [05](05-marketplace-and-challenges.md)'s open-bidding mode, where it's what keeps a ranked list from rewarding under-scoping. One implementation, used in both places.

### 2. Savings arithmetic

`backend/app/services/comparison/savings.py`. Deterministic code, `Money` throughout:

```
annual recurring savings = (current monthly cost − offer monthly cost) × 12

first-year net savings =
  annual recurring savings − switching costs − setup fees − cancellation fees
```

- Include known recurring extras on the same basis.
- Unknown material costs or conditions make the result **provisional**, displayed with its assumptions listed.
- Savings are **potential** until a switch happens. The word belongs in the UI, not a footnote.

Never compute this in the frontend. One implementation, backend, deterministic, testable.

### 3. The challenge inbox

`frontend/src/features/inbox/` — core screen 5, the owner's view of one listing's challenges.

Per offer: challenger name and profile link, normalized price, scope deltas, savings estimate with its provisional flag, evidence status (a column [07](07-challenger-evidence.md) fills in; until then it honestly reads *not checked*), the offer's provenance, and whether it was submitted under sealed or open terms.

The owner sees **every** offer here in full, regardless of bidding mode — the mode governs what other challengers see, never what the owner does.

Sorted by the owner's choice, defaulting to something defensible — not bare price.

### 4. The comparison view

Side by side, including the **current provider as the baseline row**. The incumbent is a real option and frequently the right one; a comparison that only lists challengers has quietly assumed switching.

The plan's worked example is the case to design for: the middle-priced challenger with stronger evidence beating the cheapest one with an unresolved entity match. If the UI can't express *cheaper but weaker*, it isn't finished.

### 5. Recommendation, with its reasons

A short explanation of price and scope tradeoffs pointing at specific evidence — generated, but grounded in the computed deltas and the evidence records, never in the model's own estimate of what things cost.

The model writes the sentence. The arithmetic in the sentence comes from step 2.

### 6. Actions

**View evidence**, **Request clarification**, **Shortlist / Request follow-up**.

*Request clarification* sends a message to the challenger and is the honest answer to most scope gaps — the point isn't for the platform to resolve every ambiguity automatically, it's to make the ambiguity visible so a human can ask.

Shortlisting moves the listing to `shortlisted` and is the end of the demo path.

## Done when

- [ ] Offers with different billing frequencies compare correctly on a common period.
- [ ] A scope gap is shown before, and more prominently than, a price difference.
- [ ] The current provider appears as a baseline row.
- [ ] Unknown costs render the comparison provisional with assumptions listed.
- [ ] Savings are labeled potential everywhere they appear.
- [ ] The recommendation's numbers come from the arithmetic, not the model.
- [ ] Shortlisting links the expense, listing, scope version, and offer together.

## Watch out for

- **Don't rank on price.** It's the single easiest way to make this product dishonest, and the temptation is constant because price is the only field every offer definitely has.
- Don't hide a provisional flag to make a number look cleaner. A confident wrong figure is worse than a hedged right one, and a judge will find the hedge missing.
- Don't let the model do arithmetic, including "roughly" arithmetic in prose. Numbers in generated text come from computed values.
- Don't forget the empty state. A listing with no challenges yet is the most common state in a young marketplace and it needs to look intentional.
