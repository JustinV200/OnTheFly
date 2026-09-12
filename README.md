# rho_hackathon

**List what you pay. Let anyone offer to beat it.**

A B2B marketplace built on voluntary price transparency. Connect your business account, see every expense in a private dashboard, and flip the ones you want public. Public expenses land on your profile, where any other business on the platform can see them — and counter.

> A business publishes: *"we pay $2,400/month for commercial cleaning, 8,000 sq ft, 3× weekly."*
> A cleaning company browsing the marketplace replies: *"we'll do it for $1,875."*

Working name is undecided. Full design: [plan/plan1.md](plan/plan1.md). Build order: [roadmap/](roadmap/).

## The loop

```
Connect business account
  → every expense appears in a private dashboard
  → toggle individual expenses public
  → public expenses appear on your profile
  → anyone on the platform browses and finds them
  → they click "Challenge" and submit a counteroffer
  → sealed by default, or open bidding if you flip it on
  → you compare offers, scope, and evidence against what you pay now
  → shortlist someone
```

Everything imports **private**. Nothing is ever published without you choosing it, previewing exactly what goes public, and clicking.

## Why inbound

The obvious version of this product is outbound: pick an expense, and the platform finds vendors and emails them a request for quotes. That needs discovery, qualification, and outreach infrastructure standing between a user and their first result — plus a lot of unsolicited email.

Publishing inverts it. One cheap action from the buyer, and competitors come to them. It produces a browsable marketplace instead of a series of private auctions, and every listing is a standing invitation rather than a one-time request.

The tradeoff is a cold-start problem, which is why outbound discovery survives as a way to seed the supply side rather than as the main path.

## What it does

- **Reads real transaction history** through a normalized adapter, starting with [Rho](https://docs.rho.co), with clearly labeled fixtures for spend the sandbox doesn't contain.
- **Shows every expense** grouped by vendor, with detected cadence, recurrence confidence, annualized cost, and the individual payments behind each figure.
- **Suggests what's worth listing** on an explainable heuristic — but the owner decides, and can publish something the heuristic ranked low.
- **Confirms scope before publishing**, because a price with no scope isn't something anyone can meaningfully counter. AI drafts it from transaction evidence; unknown fields stay explicit questions rather than being invented from a merchant name.
- **Publishes to a public profile** with a preview of the exact payload, and unpublishes instantly.
- **Takes counteroffers from any platform user**, revisable until the deadline, with full revision history.
- **Opens the bidding, if you want it.** Offers are sealed by default — you see them, nobody else does. Flip open bidding on and challengers see each other's prices and scope and can underbid, while their identities stay yours alone. Flipping it on never exposes an offer someone already made in confidence.
- **Checks who's offering** — entity registration, reputation, exclusion lists, regulatory history — reporting each check's source, timestamp, and limits.
- **Compares on normalized cost and scope**, not price alone.

## The two rules everything else follows from

**Private is the default and the fallback.** Every expense imports private. An expense whose visibility state is ambiguous, unset, or errored is private. The public projection is built explicitly field by field, never by filtering the private record — a serializer that starts rich and removes fields leaks the next field someone adds.

**Not checked is not the same as clean.** An unavailable source means *not checked*. A search that returns nothing means *no match found in this source* — never "proven safe." Adverse records never attach to a business on a name match alone. There is no blanket "verified" badge.

Savings are **potential** until a switch actually happens, and the UI says so.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript, Vite |
| Backend | Python + FastAPI, Pydantic |
| Database | Postgres via Supabase |
| Identity | One account type; seeded demo accounts with an in-app switcher |
| Jobs | Background worker for imports, evidence, notifications |
| Financial data | `TransactionSource` adapter — Rho first, labeled fixtures, Mercury later |
| Discovery | Tavily, behind a provider interface (secondary path) |
| Reasoning | Claude for scope drafting, offer extraction, evidence summaries |

Monetary math, deduplication, deadlines, visibility state, and offer versioning are deterministic code. The model drafts and extracts; it doesn't calculate, and it doesn't decide what's public.

## Status

Planning → early build. [plan/plan1.md](plan/plan1.md) has the full design and the record of scope decisions; [roadmap/](roadmap/) breaks it into ordered phases with done-when criteria.

Two earlier concepts are out of scope: an equipment-shopping and camera-audit product with fruit-fly neural models, and an outbound RFQ product with token-scoped vendor invitations. The images in [assets/](assets/) are left over from the first of those.

## Repo layout

```
frontend/   React + TS app (not yet created)
backend/    FastAPI app (not yet created)
plan/       Design docs — plan1.md is the plan of record
roadmap/    Phase-by-phase build order
assets/     Brand assets (stale, from a prior concept)
.claude/    Claude Code config and coding rules
```
