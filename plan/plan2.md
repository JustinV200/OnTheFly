# On the Fly — Task Ownership and Splitting Plan

**Post work you already pay for or newly need → accept an offer and ownership moves to the winner → any owner can split off pieces where that saves money → each piece is its own task, owned by whoever wins it.**

Adopted 2026-09-13 as the plan of record. It replaces [plan1](plan1.md)'s priorities; plan1 is retained for REBID detail. Its rules are in CLAUDE.md, the build order is in the [roadmap](../roadmap/README.md), and the build specification is [roadmap 12](../roadmap/12-task-ownership-and-splitting.md).

This plan extends plan1. REBID stays the entry point, and plan1's USAspending and public-rate work becomes the pricing engine for splitting. Screens build on the merged task-market UI in [roadmap 11](../roadmap/11-usability-and-dark-mode.md): **Bid** is the action, an **offer** is what a bid creates, and the owner's page is **Offers**.

## Decisions

| Question | Decision |
|---|---|
| What can be posted? | Existing spend (rebid) and new work with no current vendor. |
| Who can split a task? | Only its current **task owner**. The buyer owns a task until it accepts an offer. Then the bidder who made that offer owns it, and only they can split it. The same applies to every piece, at any depth. |
| How is a piece priced? | The owner's **starting price** is its listed price before acceptance, or the accepted offer after. Each piece takes a **cut** of that price. |
| What is splitting for? | Mainly saving money. "Ways to save" suggests only the pieces that public contract history says are cheaper to split off. Owners can also split everything (LLM-drafted) or split off a piece by hand. |
| What does a client see of pieces its task owner splits? | Nothing. The task owner is responsible for them, like any contractor who subcontracts. |
| Scope format | A common typed core, one row per requirement, and category templates. |
| Thresholds | At least 10% of keep cost and $25,000 per year in modeled savings, at least 3 distinct suppliers by UEI, 5-year lookback. |
| Fly | Comes after the splitting path. Every fly-influenced result is labeled where it appears. |

## Tasks and ownership

Everything posted is a **Task**, and a listing is its public projection. Each task records two accounts:

- **Poster:** the account that published the listing. It is the client for that task and never changes. Existing marketplace rules that say "owner" mean the poster: it sees bidder identities, can't bid on its own listing, and controls bidding mode.
- **Task owner:** the account currently responsible for the work. Before acceptance, that is the poster. Accepting an offer transfers ownership to the bidder who made it.

| Origin | Starting price | Comparison wording |
|---|---|---|
| `rebid` | Observed spend (Stripe sandbox or fixture, with provenance) | "Potential savings" |
| `new` | Owner-stated budget, or none | "vs. budget" or "vs. modeled estimate"; never "savings" |
| `split` | The cut assigned when it was split off | Remainder for the owner who split it |

Lifecycle: `private → scope confirmed → public → closed → shortlisted → accepted`. Accepting is possible once the listing has an active offer, and it closes bidding. Later bids are rejected with a clear message.

The accepted scope is the version the accepted offer answered. Acceptance is a marketplace record, not a contract; contracts, payment and delivery stay out of scope. The acceptance and the ownership transfer are audited.

A task with no starting price (a `new` task with no budget) can't be split until its owner sets one.

## Splitting and cuts

The task owner splits off a piece by choosing requirements and a cut. The piece starts `private` and goes through the same confirmation, exact preview and publish steps as any listing, with the owner as its poster. When someone's offer on the piece is accepted, they own the piece and can split it.

| | Buyer, before accepting an offer | Task owner, after acceptance |
|---|---|---|
| Starting price | Its listed price | The accepted offer |
| Splitting off a piece | The piece is listed at the cut. The parent listing's price drops by the cut, which makes a new scope version. | The piece is listed at the cut. The owner's remainder drops by the cut. |
| Piece's offer accepted below its cut | The difference is potential savings | The difference returns to the remainder |
| When the parent's offer is accepted | Pieces already split off stay with the buyer; only the parent transfers | n/a |

**Rules, all enforced in code, in integer minor units:**
- A cut is positive, in the task's currency and billing period. There is no period conversion in P0.
- Total cuts never exceed the starting price.
- An owner can't accept an offer on a piece if that would push its remainder below zero. Offers above the listed price are flagged before acceptance.
- Every requirement stays with the task or goes to exactly one active piece.
  - An offer that answered a scope version whose requirements now belong to a piece can't be accepted. The bidder can revise onto the current version.
- **Undoing a split** is allowed while the piece has no accepted offer and, for a buyer's split, while the parent has no accepted offer. The cut and requirements return, the piece's listing closes, and its offers are retained.
- **Depth** is unlimited in design but capped by a config value as a safeguard. The screen is the same at every depth.

## Ways to save

The primary entry point. It works the same for a buyer before acceptance and for any task owner after.

A **segment** is a group of requirements that could be split off together. In P0, segments are formed deterministically by grouping confirmed requirements on their confirmed labor-category and PSC/NAICS tags. In P1, pieces from the general split become additional candidates.

For each segment, code computes, on a common annual period:

- **Keep cost:** confirmed hours × the owner's own **cost basis rates**. For a task owner that won the task by bidding, those are internal loaded cost rates. For a buyer, they are the billed rates in its current contract. Both come from the owner and stay private.
- **Suggested cut:** the same hours × the median matching public labor rate (GSA CALC+ or another documented source), showing the interquartile range. Record source, retrieval date and matched labor categories.
- **Oversight cost:** an amount the owner enters for managing the piece. If unset, the card is **provisional**.
- **Modeled savings:** keep cost − suggested cut − oversight cost. Percentages are stored in basis points.

Hours are drafted by the LLM from the confirmed scope and labeled as an estimate until the owner confirms them. Both sides use the same hours, and that assumption is shown. Public rates are ceiling billing rates, and the card says **Modeled cut from public pricing — not an offer**.

**Without cost basis rates, there are no suggestions.** A share of the starting price allocated across segments spreads any overpayment evenly. It would flag every segment by the same percentage, which isn't a piece-specific saving. Those cards show "Add your rates to find specific savings" and stay out of the suggestion list.

**Market evidence** comes from USAspending prime awards and reported subawards, matched on the segment's PSC/NAICS, place of performance, and the lookback window. Suppliers are counted by UEI, never by name. Subaward reporting is incomplete, so counts are a floor. An unavailable source is "not checked"; zero results means "no match found in this source."

**A segment is suggested when all of these hold:**
- Modeled savings reach both thresholds.
- Distinct suppliers reach the minimum.
- The inherited constraints (clearance, location, set-aside) don't exclude every counted supplier, where that can be checked by identifier.
- The total of cuts still fits the starting price.

Thresholds live in config and are printed on every card. Never lower them to force a demo result.

A segment with enough suppliers but no computable or positive savings appears separately as **Specialist market — no modeled savings**.

**Each card shows:**
- Requirements covered
- Hours and their status
- Keep cost, suggested cut and oversight cost, with sources
- Modeled savings, marked potential and provisional where applicable
- Supplier and award counts, with award IDs and links
- Sources not checked
- Thresholds
- **Split off** / **Dismiss** buttons. A dismissal persists for that scope version.

**Never used for pricing:** offers on any listing, sealed or open, individually or in aggregate. Also never used: model-generated prices, or supplier matches made by name.

**Other entry points.** **Split everything** (P1) has the LLM propose a full set of pieces with dependencies, deliverables and acceptance criteria, each with a card where computable. **Split off manually** lets the owner pick requirements, or describe a piece and confirm the requirement mapping. Manual splits skip thresholds but still show the card, including when splitting costs more.

## Flow-down and scope changes

Constraints on assigned requirements (clearance, location, insurance, set-aside eligibility) carry into the piece and are on by default. Removing one is an explicit, audited action with a warning.

A new scope version on a parent flags affected pieces "parent scope changed, review." Nothing is rewritten, and offers stay attached to the version they answered.

## Model and code boundaries

| The LLM drafts (owner confirms) | Code decides |
|---|---|
| Requirements and labor-category / PSC / NAICS tags, from owner-provided scope | Segment grouping (P0), coverage, overlaps, dependency cycles |
| Hours per segment, labeled as an estimate | Every cost, cut, remainder, savings figure, threshold and tier |
| Split-everything pieces, dependencies, deliverables (P1) | Evidence queries, supplier dedupe by UEI, counts, not-checked status |
| Mapping a manual free-text piece to requirement IDs | Ownership transfer, constraint flow-down, acceptance guards |
| A plain-language summary of evidence already retrieved | Visibility, deadlines, offer versioning, the payer chain |

The model never publishes, prices, accepts, chooses bidders, or establishes identity. Every LLM split draft records the model, prompt version and input scope version.

## Visibility across owners

- **Fresh public projection.** A piece's public projection is built field by field. **Never public:** the parent task, its poster, its accepted price, the owner's rates, remainder or savings cards, and other pieces' cuts.
- **Price display.** A piece's price (its cut) and a `new` task's budget are shown only if the poster turns that on at publish. Otherwise the market card shows "Price not disclosed." Rebid listings keep their current behavior.
- **Direct counterparties only.** Each account sees the poster of tasks it owns, and the bidders on tasks it posted. Nothing two steps away: a buyer never sees who bids on pieces its task owner splits off, and those bidders never see the buyer.
- **Subcontract label.** A piece split from an accepted task is labeled **Subcontract**, so bidders know payment depends on the account above. Pieces a buyer splits before acceptance are ordinary listings.
- **Payer chain.** A piece's payer chain is its poster plus, if the poster owns the parent through an accepted offer, the parent's payer chain. No account in the chain can bid on the piece.
  - The current rule "an owner can't bid on its own listing" becomes the first link.
  - A bidder who wins a buyer's parent task is not in the chain for pieces the buyer split off earlier.
- **Bidding rules.** Sealed-by-default, open bidding, identity privacy and no-retroactive-mode rules apply to every piece unchanged.

## Money views

Every owner sees one view per task it owns or posted. Figures are integer minor units in one currency and period, with scope gaps shown before price.

- **Buyer:** starting price (baseline) and each accepted or pending amount, for the parent and its own pieces. It sees potential savings against the baseline, but nothing below its direct counterparties.
- **Task owner:** accepted price, the cut and accepted price of each piece it split off, and the remainder. If cost basis rates exist, it also sees keep cost of the retained requirements and potential margin.

Savings and margin stay **potential** until work actually changes hands.

## Fly, after splitting

Fly work starts once the splitting path is complete:
- Fly Scout explores already-qualified suppliers for a published piece.
- The existing `flybrain` FlyHash can rank retrieved award descriptions by similarity to a segment.

Plan1's Fly Scout limits still apply. It never computes money, qualifies suppliers, establishes identity, or declares a best offer. It also makes no neuron-count claims without runtime evidence.

**Every fly-influenced result is labeled where it appears.** Page-level notes don't count.
- **Badge:** the result carries the fly badge (`FlyBrainBadge`, violet tone) with a plain-language role, such as "Fly Scout picked this supplier to research next" or "Ordered by Fly similarity".
- **Disclosure:** it opens to show the component, inputs and run record. Circuit names can sit in that disclosure, per roadmap 11's plain-words principle, but fly involvement itself is never hidden.
- **Styling:** fly output is never styled as a verdict, score, status or recommendation to accept.

## Demo

Accounts: **GovCon Industries** (buyer), **Prime A** and **Sub B**. All are demo identities with fixture cost basis rates, labeled as such.

1. **Buyer.** GovCon's labeled fixture ledger → REBID on DevSecOps Engineering Support → requirements confirmed. Ways to save runs on GovCon's contract rates. If a segment qualifies (say, ATO documentation), GovCon splits it off. It previews and publishes both listings.
2. **Acceptance.** Prime A bids on the DevSecOps listing from a second device. GovCon accepts, ownership moves to Prime A, and GovCon's Split button disappears.
3. **Task owner.** Prime A opens Ways to save, built from its rates, public rates and actual USAspending results. It splits off a piece at the suggested cut. The preview shows no GovCon name and no accepted price. Publish.
   - If no segment qualifies, the screen says so and Prime A splits off a piece manually.
4. **Next owner.** Sub B bids on the piece from a third device. Prime A accepts, and Sub B now owns the piece and sees its own Split button.
5. **Money.** GovCon sees potential savings. Prime A sees its remainder. Sub B sees its starting price.

Step 1's buyer split can be skipped in a short run; steps 2–5 are required. One seeded `new` task also appears on the market board.

## Priority

**P0 — splitting path** (checklist in [roadmap 12](../roadmap/12-task-ownership-and-splitting.md))
- Plan1 prerequisites: GovCon fixtures, Stripe sandbox verification, REBID with confirmed requirements and a modeled whole-task cost, USAspending discovery, one public labor-rate path.
- Tasks with poster and task owner; acceptance and ownership transfer.
- Requirements, category templates and per-requirement offer responses.
- `new` tasks.
- Cuts, remainder, manual splits for buyers and task owners, undo, flow-down, payer chain, piece projections.
- Cost basis rates, market evidence, Ways to save, money views.

**Gate:** rebid → accept → ownership transfers → Ways to save from real public evidence → piece split off and published → piece's offer accepted → the new owner can split → every money view reconciles.

**P1:**
1. Split everything (LLM)
2. LLM scope drafting for new tasks
3. Tavily enrichment
4. Fly Scout and FlyHash award ranking, with labeling
5. Roadmap 11 screens for My work, the split drawer and Ways to save
6. Roadmap 11's keyboard-focus and honesty-label audit, including the new screens
7. Three-device rehearsal and backup recording

**P2:** splitting before bidding (teaming, with offers contingent on award); period conversion between a task and its pieces; autonomous tool selection; fly learning; production auth and hosting.

## Open questions

Tracked at the top of the [roadmap](../roadmap/README.md), "Open questions to answer before building", with proposals and what each one blocks. Record answers there and update this plan to match.
