# Demo runbook

The click-by-click version of the plan's demo script ([../../plan/plan1.md](../../plan/plan1.md), "End-to-End Demo") as the product runs it today. Written for [../09-demo-polish.md](../09-demo-polish.md). Rehearse on the deployed URLs, not localhost.

## Before you start

1. `cd backend && python -m app.cli.seed_demo --confirm-remote` against the deployed database. This is the **live** scenario: everything private, nothing published.
2. `python -m app.cli.preflight --api https://<api> --frontend https://<app>`. Every automated line should say PASS. The genuine-offer line says WARN until phase 01 delivers.
3. Open two windows:
   - **Presenter window**: the app, acting as **Apex Facilities Group**.
   - **Stranger window**: a private or incognito window at `https://<app>/p/apex-facilities`, ideally on a phone on cell data. A cold session starts as **Public visitor**, sending no account header, exactly like a stranger's browser.

The orange strip under the navigation is always on screen. It says the financial data is fixture data and whether any counteroffer is genuine. Don't hide it; volunteer it.

## The script (live scenario)

| # | Say | Do |
|---|---|---|
| 1 | "This is the connected account's history." | Private dashboard: the connection line shows transaction count, date range, and the `source: fixture · demo data` badge. |
| 2 | "Every expense starts private." | Point at the summary: **6 private, 0 public**. Every row shows 🔒 Private. Payroll shows "never publishable". The Fly brain alias panel suggests merging "Sparkle Cleaning Services LLC" into Sparkle Clean; leave it for now, because a merge changes the count to 5 and the trace in step 9 to 13 transactions. |
| 3 | "Publishing is one expense, with its scope, previewed exactly." | Sparkle Clean → **Review & publish…**. Confirm the scope. **Set Supplies, Equipment, and Taxes to Included** so scope gaps have something to catch. Leave bidding sealed and the vendor name blank. Click **Preview exactly what goes public**: the JSON on the right is the literal payload. Show the "Never public" list. Click **Publish this listing**. |
| 4 | "Here's what a stranger sees." | Refresh the stranger window: one public listing, nothing else. |
| 5 | "Now I'm the other side of the marketplace." | Switch to **Bay Clean Professional Services** → Marketplace → **Challenge this price**. The sealed-bidding notice sits above the price. **Offer the full requested scope**, price `1875`, submit. |
| 6 | "Back to the owner." | Switch to **Apex** → dashboard → **Offers inbox**. The offer appears within 5 seconds, with provenance, bidding mode, and every evidence check with its source and time. "Not checked" is shown, not hidden. |
| 7 | "Open bidding turns it into an auction." | **Open bidding to underbids** (read the message: sealed offers stay sealed). Switch to **Golden Gate Janitorial** → challenge at `1950` with Equipment **Not included**. Switch to **Summit Building Services** → open the listing page: the leaderboard shows one price plus "1 offer was made while bidding was sealed". Challenge at `1800` with the full scope, then reopen the listing: two ranked rows, scope coverage beside each price, no names. |
| 8 | Genuine offer, if phase 01 delivered | Run the reset with `--scenario staged` beforehand, or see "Genuine offer" below. It appears as the green card at the top of the owner's inbox with the real amount, terms, received time, and channel. |
| 9 | "Where does $X come from?" | Apex → inbox → **Where does this number come from?** Walk down: savings arithmetic, offer, scope version, listing, current-price baseline, private expense, 12 transactions. |
| 10 | Shortlist | **Not built** (deferred to [../10-stretch.md](../10-stretch.md)). Say "the owner would shortlist here" and move on. Don't mime a button. |
| 11 | "The owner stays in control." | Dashboard → **Unpublish now** on Sparkle Clean. Refresh the stranger window: "No public listings right now". The old listing link now says "This listing isn't public". The inbox keeps its offers under a "private now" banner. |

## The privacy proof (40 seconds, rehearse as one unit)

Steps 2 → 3 (preview only) → 4 → 11. The question it answers: *"What stops someone publishing their whole account by accident?"*

- Nothing imports public, and the summary shows **N private, 0 public**.
- Publishing is per expense, behind a preview of the literal payload. The server refuses to publish if the payload changes after the preview (hash check).
- The stranger window shows one listing and nothing else. Transactions, other expenses, and challenger names never leave the server.
- Unpublish is one click with no confirmation, and the stranger's refresh shows it gone.

## Recovery

| Symptom | Fix |
|---|---|
| Data half-mutated from a rehearsal | `python -m app.cli.seed_demo --confirm-remote` (live) and restart the script. |
| Live publish fails on stage | `--scenario staged` gets the listing public with offers in one command. Pick up at step 6. |
| Challenger sees "The owner changed bidding…" | Intended: the mode changed while they were typing. Click the confirm button and submit again. |
| Offer rejected "Challenge deadline has passed" | The scope had a past deadline. Republish with no deadline or a future one. |
| Blank page or "Could not reach the API" | Check preflight. The error state names the API URL it tried. |

## Genuine offer

Genuine offers live in `backend/demo_data/genuine_counteroffers.json` (gitignored). Every reset copies offers from the database into it before dropping anything. Offers from the seeded demo businesses are never counted as genuine. Offers submitted in the UI by the five seeded accounts are labeled `demo data · simulated` automatically, whatever the form sends. To add a quote received by email or phone, follow the ledger format in [../../backend/README.md](../../backend/README.md), then run `--scenario staged`.

If none arrives before the cutoff, the strip reads "all N shown are simulated demo data. No genuine counteroffer has arrived." Say it out loud too.

## Questions to rehearse

- **"Where did that number come from?"** Step 9, the trace. Every figure is computed by the server from integer cents. The model computes nothing.
- **"Is that real data?"** Point at the strip and the `fixture · demo data` badges. Fixtures, labeled everywhere. Stripe's sandbox accounts don't contain recurring commercial-cleaning payments, so the demo expenses come from labeled fixtures. The Stripe sandbox connection on the dashboard is real and labels its rows `sandbox`.
- **"What stops an accidental publish?"** The privacy proof.
- **"What if nobody challenges?"** Open a listing with no offers: "No offers yet … most listings start this way". A cold start is expected, and outbound invitations are the planned answer to it.
- **"Can challengers see each other?"** Leaderboard rows have prices, scope coverage, time, and origin, never a name. Sealed-era offers are counted but never priced.

## Known seams, stated not hidden

- The demo expenses are fixture data, not a live bank connection. The optional Stripe panel connects a sandbox account, and its rows are labeled `sandbox`.
- Identity-match and registry evidence checks don't run yet. They show as "not checked", and the rollup says "information missing".
- Shortlisting, contracts, and payments are out of scope for the demo.
- The challenge form's task checklist is the demo template's tasks (vacuum, trash, restrooms). Other tasks go in "other inclusions".
