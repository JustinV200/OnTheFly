# Antenna

<img src="assets/fruit-fly.svg" alt="Antenna fruit fly mascot" width="200" />

Shop with better senses. Antenna is a shopping assistant that helps you set a budget, build a shopping list, and make smarter purchase decisions — first as a Chrome extension for online shopping, then extended into a live augmented-reality view for shopping in physical stores.

It's built on the nervous system of *Drosophila melanogaster* (the fruit fly) as both inspiration and vocabulary: a tiny brain with fast, well-understood reflexes. One piece of that — the Mushroom Body catalog matcher below — is a real published fly-brain algorithm, not just a theme.

Full design details live in [plan/plan1.md](plan/plan1.md).

## What it does

- **Set a budget and a shopping list**, for a specific task (a trip, a dorm setup) or ongoing.
- **Get suggested items and reviews** surfaced automatically while you browse.
- **Check budget realism** — is your budget actually enough for what's on the list?
- **Ask more about any product** and get researched answers, not just a spec sheet.
- **Track real spend automatically** by reading transactions via the Rho API, matching purchases to your list, and updating your budget without manual entry.
- **Point your phone at a store shelf** and see relevant items boxed live in the camera view, with reviews, price match, and an "already bought" flag pulled straight from your transaction history.

## The nervous system

| Part | Real fly anatomy | What it does here |
|---|---|---|
| **Compound Eye** | Wide-field, fast-motion vision | The live AR camera view — detects and boxes relevant items in real time as you move through a store |
| **Mushroom Body** | Kenyon cells — sparse coding for scent recognition | Fast catalog matching (FlyHash) that shortlists candidate products before an AI makes the final call |
| **Halteres** | Balance organs used for flight stability | Budget realism checks — is your budget balanced against what's on the list? |
| **Proboscis** | Feeding tube used to sample and taste | The "Ask More" agent — digs into reviews, specs, and comparisons for a specific product |
| **Metabolism** | Consumption and energy use | Transaction sync via the Rho API — tracks what's actually been spent and reconciles it against the budget |

Compound Eye and Mushroom Body are real technical components; Halteres, Proboscis, and Metabolism are names layered on top of already-planned features. Nothing here sits between a user and the AI reasoning that actually needs to be fast and correct.

## Status

Early planning stage — see [plan/plan1.md](plan/plan1.md) for the full breakdown, tech stack, build order, and open questions.
