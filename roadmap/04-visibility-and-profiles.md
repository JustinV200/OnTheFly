# Phase 04 — Visibility and public profiles

> Status reconciliation — 2026-09-12: Publishing/preview, explicit public projection, profile routes and scope versions exist. Reuse these and add DevSecOps scope. REBID starts private research; it does not automatically publish account data. Cleaning fields below are historical, not the new category schema.
>
> Follow [the current P0/P1/P2 roadmap](README.md) and [current product plan](../plan/plan1.md). The earlier specification below is retained for reusable implementation detail. Its old priorities, demo category, and unchecked boxes are not a current completion report.

## Earlier component specification

**Goal:** an owner flips one expense public, confirms its scope, sees exactly what the world will see, publishes it to their profile, and can take it back instantly.

**Depends on:** [03](03-expense-dashboard.md). **Size:** L. **Critical path:** yes.

**This is the product's defining mechanic and its defining risk.** Every other phase can fail visibly and be fixed. This one can fail *invisibly*, by publishing something the owner didn't intend — and publication is irreversible in practice, because unpublishing doesn't unsee.

Build it so that the failure mode requires deliberate effort rather than mere carelessness.

## Steps

### 1. The public projection is its own model — build it first

`backend/app/models/listing.py`. A `PublicListing` is constructed **explicitly, field by field**, from a `ServiceExpense` plus a confirmed scope plus disclosure choices.

It is never a serializer over the private record. Never `exclude=[...]`, never a `to_public()` that starts from `self.__dict__`, never a response model that inherits from the private one.

The reason is structural, not stylistic: a subtractive approach means **the next field anyone adds is public by default**. Six phases from now, someone adds `internal_notes` to `ServiceExpense` and ships it to the marketplace without noticing. An additive projection makes the same mistake impossible — a new private field simply doesn't appear until someone writes a line putting it there.

Write the projection function with an explicit test that constructs an expense with a novel unexpected field and asserts it isn't in the output.

| In the projection | Never in it |
|---|---|
| Category, scope summary | Raw transaction history |
| Price and billing cadence | Account or connection details |
| Service area (approximate) | Any other expense, public or private |
| Challenges open, and any deadline | Challenger identities, in either bidding mode |
| Count of challenges received | Offer amounts, unless open bidding is on |
| Bidding mode | Exact street address unless opted in |
| Owner's business name and profile link | Incumbent vendor name unless opted in |

### 2. Scope confirmation, derived from the phase-01 paper listing

`backend/app/models/scope.py`. Take the description written by hand in [01](01-real-counteroffer-path.md) and turn its fields into the schema — that document was understood by a real provider, which beats any guess.

For cleaning: service area and location, square footage, visit frequency, bathroom count, required tasks and quality expectations, supplies/equipment/taxes inclusion, insurance and other requirements, start date, minimum term, cancellation constraints, current price and cadence, challenge deadline.

Two required properties:

- **Every field can be explicitly unanswered**, distinct from empty. "Bathrooms: not specified" is real information to a challenger; "Bathrooms: 0" is a lie.
- **Scope is versioned.** Challenges attach to the version they answered, so a later edit can't retroactively reframe an existing offer.

A price with no scope isn't counterable, so **scope confirmation is a required step in publishing**, not an optional enrichment.

### 3. AI-drafted scope, with gaps left as gaps

`backend/app/services/listings/draft.py`. The model drafts from transaction evidence plus owner input, using structured output.

**It must not invent details from a merchant name.** Knowing the payee is "ABC Cleaning" says nothing about square footage or bathroom count. Unknown fields come back marked unanswered and render as explicit questions. This is the easiest rule in the project to violate by accident, because a fluent model will happily fill every field it's shown.

### 4. Visibility state machine and audit trail

`backend/app/services/listings/visibility.py`:

```
private → scope confirmed → public → closed → shortlisted
              ↑                 │
              └──── unpublish ──┘
```

- Transitions are explicit guarded functions. Nothing assigns the state field directly.
- Going public requires: a confirmed scope, an eligible expense, and an explicit owner action carrying the previewed payload's fingerprint.
- **Unpublish is always available, immediate, and retains received challenges.**
- Every transition writes an audit record: who, what, when, and the exact public payload at that moment. When someone asks "was our price ever public?", the answer is a query, not a guess.

### 5. Publish flow with a mandatory preview

`frontend/src/features/publish/` — core screen 2.

1. Confirm scope, answering the open questions.
2. Confirm the current-price baseline from phase 03.
3. Choose disclosures — **incumbent vendor name (default off)**, exact address (default off), **open bidding (default off)**, challenge deadline.
4. **Preview the exact public payload**, rendered as a challenger will see it.
5. Publish.

Open bidding is implemented in [05](05-marketplace-and-challenges.md), but its toggle lives here, alongside the other disclosure choices — it belongs to the same decision the owner is already making. Explain what it does in one line at the toggle: challengers will see each other's prices and scope, but never each other's names.

The preview is not a courtesy screen. It renders *the actual projection output*, not a mockup of it — so a bug in the projection is visible to the owner before it's visible to the world. Wire it to the same function that serves the public page.

Warn at the disclosure step that publishing the incumbent's name discloses a third party's pricing, which may be commercially sensitive or restricted by the contract itself.

### 6. Public profile page

`frontend/src/features/profile/` — core screen 3, at `/p/:handle`, reachable with **no acting account at all**.

Shows the business name, service area, and its public listings. Nothing else. A profile page that accidentally renders a private expense is the single worst bug this product can have, so the page takes the projection output and cannot access the private models at all — enforce that at the API boundary, not by discipline in the component.

### 7. Bulk operations, carefully

If you build multi-select publishing, the confirmation **lists every affected expense individually** with its price. No "publish 7 expenses?" — an itemized list, then confirm.

Honestly: consider skipping bulk publish for the MVP. It adds the highest-consequence interaction in the product for very little demo value.

## Done when

- [ ] The public projection is an explicit additive model with a test proving unknown fields don't leak.
- [ ] Publishing requires scope confirmation and cannot be reached any other way.
- [ ] The preview renders the same function output that serves the public page.
- [ ] Incumbent vendor name and exact address default to hidden.
- [ ] A public listing is visible at `/p/:handle` to a stranger with no account.
- [ ] A private expense is **not** reachable from the public API by any URL, including by guessing an ID.
- [ ] Unpublish works instantly and retains received challenges.
- [ ] Every visibility change writes an audit record with the payload.
- [ ] Payroll, taxes, and transfers cannot be published even by direct API call.

## Watch out for

- **Test the leak, don't assume it.** Log out entirely, take a private expense's ID, and hit the public endpoint with it. Do the same as a *different* acting account. Both must fail. This is the test worth writing before the feature.
- **Never let a background job change visibility.** Not import, not categorization, not scope drafting, not a retry. Publication is an owner action carried by a request, full stop.
- Don't cache the public projection without an invalidation path on unpublish. A cached listing served after unpublishing is a broken promise.
- Don't let the preview be a separate component that "looks like" the public page. Same function, same output, or the preview is theatre.
- Don't put a visibility toggle on anything ineligible. And enforce it in the service too — a UI-only guard is not a guard.
