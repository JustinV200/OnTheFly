# Phase 03 — Expense dashboard

> Status reconciliation — 2026-09-12: Expense grouping, recurrence, annualization, corrections and the dashboard exist. GovCon Industries/fixture_govcon_main is seeded, with exact totals covered by tests (merged 2026-09-13). Next: check its display on screen and add REBID. Existing cleaning fixtures remain regression data.
>
> Follow [the current P0/P1/P2 roadmap](README.md) and [current product plan](../plan/plan2.md). The earlier specification below is retained for reusable implementation detail. Its old priorities, demo category, and unchecked boxes are not a current completion report.

## Earlier component specification

**Goal:** the owner's private view of **every** expense they have — grouped, enriched with cadence and annualized cost, correctable, and traceable back to individual payments.

**Depends on:** [02](02-financial-ingestion.md). **Size:** M. **Critical path:** yes.

This is the screen the user spends the most time on, and the surface the visibility toggle lives on in [04](04-visibility-and-profiles.md). Note the change from a ranked-opportunities model: **show everything.** Ranking becomes a suggestion layered on top, not a filter that decides what the user is allowed to see. A user who can't find an expense they know they pay will not trust the dashboard with the ones they can.

## Steps

### 1. Vendor normalization — deterministic first

`backend/app/services/expenses/vendor_normalize.py`.

Raw merchant descriptors are noisy (`SQ *ABC CLEANING SVC 8005551234 NY`). Normalize deterministically: strip processor prefixes, trailing phone numbers and store IDs, case-fold, collapse whitespace.

Then optionally have the model *suggest* a display name and category for descriptors the deterministic pass leaves ambiguous. Structured output, and the suggestion lands in the UI as an editable field the owner confirms — never a silently applied fact.

Persist the mapping from raw descriptor to confirmed vendor so a correction sticks across future imports. Small feature, large effect on whether the dashboard feels real.

### 2. Group and detect recurrence

`backend/app/services/expenses/recurrence.py`. Per vendor group:

- **Cadence:** weekly, biweekly, monthly, quarterly — from intervals between payments.
- **Interval regularity:** how consistent those gaps are.
- **Amount stability:** identical, near-identical, or variable.
- **Observation window:** first and last payment, and how many periods that spans.
- **Recurrence confidence:** derived from the above, with the factors retained.

Deterministic code. Three payments 30 days apart at the same amount is arithmetic, not inference. Two payments isn't yet a pattern — set a floor and say so in the UI rather than guessing from a single interval.

**One-off and irregular spend still appears on the dashboard**, marked as such. It just isn't a publishing candidate.

### 3. Annualized baseline

`backend/app/services/expenses/baseline.py`. Cost per period and annualized cost in `Money`, **with supporting transaction IDs attached to the result**.

Every figure must be clickable back to the payments that produced it. That traceability is a success criterion, cheap now and expensive to bolt on later — and it's what a challenger's skepticism, and a judge's, lands on.

### 4. Eligibility classification

`backend/app/services/expenses/eligibility.py`, applying the plan's table. The categories that matter most are the **hard exclusions**: payroll, taxes, and internal transfers are never suggested and **never publishable**, enforced in the service layer rather than by the UI declining to show a toggle.

Everything else is publishable at the owner's discretion, with the heuristic offering an opinion.

The owner can override category and eligibility. The classifier proposes; the owner decides.

### 5. Listing suggestions, with legible reasons

`backend/app/services/expenses/suggestions.py`:

```
listing priority =
weighted( annualized spend, replaceability, recurrence confidence, ease of describing scope )
```

**A weighted sum, not a product.** A product zeroes out on any single weak factor and makes "show the reasons alongside the rank" impossible to render — you can't state a factor's contribution. A weighted sum gives you a per-factor breakdown for free, which is exactly what the UI promises.

The result carries each factor's value and a short human-readable reason. These rank *suggestions*; they don't predict savings, and the UI must not imply otherwise.

Low-ranked expenses are shown with their reason, never hidden. "We didn't suggest this because the amount varies month to month" is useful; silently omitting it is not.

### 6. API and screen

- `backend/app/api/expenses/` — list all expenses for the acting account, get one with its supporting transactions, patch vendor/category/eligibility.
- `frontend/src/features/dashboard/` — core screen 1.

The dashboard shows, per row: vendor, category, amount per period, cadence, annualized cost, recurrence confidence, and a **visibility indicator** (phase 04 makes it interactive; here it renders as private).

Plus: total tracked annual spend, sorting and filtering by amount, cadence, category and visibility, a detail view with supporting payments, and inline correction controls.

Label the total honestly — it is **tracked spend**, not eligible spend and certainly not potential savings.

## Done when

- [ ] Every imported expense appears, including irregular and one-off spend.
- [ ] Payments group under a normalized vendor, and a correction persists across a re-import.
- [ ] Recurring expenses show cadence, confidence, and observation window.
- [ ] The annualized figure traces back to individual transactions in the UI.
- [ ] Payroll, taxes, and transfers are marked permanently ineligible in the service layer.
- [ ] Suggested listings show why they were suggested, and unsuggested ones show why not.
- [ ] Every row shows a visibility state, and every one reads private.

## Watch out for

- **Don't filter the dashboard down to opportunities.** That was the old design. Hiding expenses to make the ranked list look sharp costs you the user's trust in the whole screen.
- **Don't let the model assert contract terms.** It can suggest a merchant looks like a cleaning company. It cannot know contract length, notice period, or what's included — those are explicit questions for the owner in phase 04.
- Don't rank on annualized spend alone. Rent is usually the largest publishable-looking line and is almost always the wrong answer.
- Don't build the publish flow here. This phase ends at a visibility indicator that doesn't do anything yet.
- Don't compute the annualized figure in the frontend. One implementation, backend, deterministic.
