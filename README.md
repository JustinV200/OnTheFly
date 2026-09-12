# On the Fly

<img src="assets/fruit-fly.svg" alt="On the Fly fruit fly mascot" width="200" />
<img src="assets/mascot.jpeg" alt="On the Fly mascot" width="200" />

Procurement that keeps up with you. On the Fly helps a team lead set a budget, build an equipment list, and make smarter purchase decisions against real card spend — as a web app for buying online, and a live augmented-reality view for buying in a physical store.

It's built on the nervous system of *Drosophila melanogaster* (the fruit fly) as both inspiration and vocabulary: a tiny brain with fast, well-understood reflexes. One piece of that — the Mushroom Body catalog matcher below — is a real published fly-brain algorithm, not just a theme.

Full design details live in [plan/plan1.md](plan/plan1.md).

## What it does

- **Set a budget and build a list** for a defined job — equipping two new hires, an office refresh, supplies for a team offsite.
- **Get suggested items and reviews** surfaced as you shop, so you don't leave the page to vet a product.
- **Check budget realism** — is $4,000 actually enough for what's on the list, and which line items are the risk?
- **Ask more about any product** and get researched answers, not just a spec sheet.
- **Track real spend automatically** — card transactions sync in and reconcile against the budget as they post, with no manual logging.
- **Point your phone at a shelf** and see relevant items boxed live in the camera view, with reviews, price match, and an "already bought" flag pulled straight from spend history.

## The nervous system

| Part | Real fly anatomy | What it does here |
|---|---|---|
| **Compound Eye** | Wide-field, fast-motion vision | The live AR camera view — detects and boxes relevant items in real time as you move through a store |
| **Mushroom Body** | Kenyon cells — sparse coding for scent recognition | Fast catalog matching (FlyHash) that shortlists candidate products before an AI makes the final call |
| **Halteres** | Balance organs used for flight stability | Budget realism checks — is your budget balanced against what's on the list? |
| **Proboscis** | Feeding tube used to sample and taste | The "Ask More" agent — digs into reviews, specs, and comparisons for a specific product |
| **Metabolism** | Consumption and energy use | Transaction sync — tracks what's actually been spent and reconciles it against the budget |

Compound Eye and Mushroom Body are real technical components; Halteres, Proboscis, and Metabolism are names layered on top of already-planned features. Nothing here sits between a user and the AI reasoning that actually needs to be fast and correct.

## Transactions

Spend data comes through a `TransactionSource` interface with two implementations behind it:

- **`RhoSource`** — the live [Rho API](https://docs.rho.co) sandbox, which is open and needs no account.
- **`MockSource`** — a seeded fixture plus an inject endpoint, emitting the identical Rho response shape.

Selected by one env var, so nothing downstream knows which is active. The mock unblocks development with no network dependency and can post a transaction on cue; the Rho path stays a real integration.

## Status

Planning. [plan/plan1.md](plan/plan1.md) has the full breakdown — features, tech stack, build order, and open questions — plus a record of the scope decisions already made and why, so they don't get relitigated mid-build.
