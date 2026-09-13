# Phase 11 — Usability redesign and dark mode

> Status — 2026-09-13: Built and merged to `main`: theme tokens, dark mode, primitives, the compact shell, the market card, and the task-market screens (Markets, market page with bid ticket, bid form, Publish stepper, Spend, My listings, Offers, trace, Invite suppliers). Checked in screenshots at 1280px light and 390px dark, and with one submitted bid; keyboard focus and a screen-by-screen honesty-label audit are still open. Planned from a walkthrough of the running staged demo at desktop (1280px) and phone (390px) widths. This is the detailed specification behind roadmap 09's "Establish the visual system and application shell" and "Redesign the five core screens"; 09's provenance audit, privacy proof and rehearsal steps are unchanged.
>
> Follow [the current P0/P1/P2 roadmap](README.md) and [current product plan](../plan/plan2.md). The next screens on this system are My work, the split drawer and Ways to save ([12](12-task-ownership-and-splitting.md), steps 6, 9 and 10).

**Goal:** on any screen, a first-time user can tell within a few seconds what they are looking at, whether it is private or public, and what to do next. This must work in light and dark mode without dropping any honesty label.

## Task market direction (update 2026-09-13)

The visual reference moves from Robinhood/Supabase to a prediction-market app (Kalshi): On the Fly is a **task market**. Each public listing is a market for one task a business pays for; other businesses bid to do it for less. The goal is Kalshi-level intuitiveness: a board you can scan, a big price, and one obvious action. Every rule in CLAUDE.md and every honesty label below still applies.

**Added to this plan**

- **Market board.** The marketplace is a grid of market cards (shared `MarketCard`): category tile and area, the current price as the big number with a short period, one line of scope, and badges for bidding mode, offer count and time left. The whole card opens the listing; its one button is **Bid**. A search field (reads `?q=`), category chips built from the categories in the feed, and sort chips (Most offers, Closing soon, Newest).
- **Market page.** A listing page reads like a market: price headline, an offer chart for open bidding (public, anonymous offer prices over time from the leaderboard, with a current-price reference line only when the listing is billed monthly, since the frontend never converts periods) or a sealed panel with the offer count, tabs for Scope, Leaderboard and How bidding works, and a sticky **bid ticket** on the right. The ticket takes a price and billing period and continues to the full offer form prefilled (`?price=&billing=`), where scope coverage is confirmed before submitting.
- **My listings.** A portfolio-style page of everything the acting business has put up for bids: status, current price, offer count, and actions (Offers, Invite suppliers, Unpublish). Never shown to a public visitor.
- **Invite suppliers** (roadmap 08) lives on My listings and the offers inbox: find suppliers, preview the exact email, approve, and track per-supplier status.
- **Dark mode** as a real token swap: `themes/light.css` and `themes/dark.css`, `npm run check:colors`, and `npm run check:contrast` (28 role pairs, both themes).
- New shared primitives: SegmentedControl, FilterChips, Tabs, Disclosure, Drawer, CopyButton.

**Changed or removed**

- The desktop switch band is gone; the account menu is the switcher (businesses, then Public visitor set apart, then the public profile link and the full theme choice).
- The top bar carries a one-click light/dark flip; Light / Dark / System lives in the account menu, so the bar stays one row with the full business name.
- The demo-data strip is a chip that still states both facts ("Fixture spend · 2 simulated offers") and is never truncated.
- Header search only on very wide screens; the market board has its own search.
- "Our public profile" leaves primary navigation for the account menu. Navigation is **Markets · Spend · My listings**.
- Fly-brain labels move to their own violet tone; green is the action accent.
- Market cards never show a derived "best offer": the feed only has counts, and prices depend on the bidding mode.

User-facing words: **Bid** is the action, an **offer** is what a bid creates, and the owner's page is **Offers**.

**Depends on:** nothing on the backend for the foundation. Screen steps land alongside the P0/P1 work that changes those screens. **Size:** L. **Critical path:** P1. Theme tokens and primitives can start in parallel with P0.

## What makes the current UI hard to use

### Across every screen

- **No design system.** The frontend has no stylesheet: 267 inline style objects across 54 files and 123 hardcoded colour literals across 49 files. Buttons, inputs, selects and date pickers are unstyled browser defaults, and links are default blue underlines. A primary action looks the same as a secondary or destructive one: "Unpublish now" and "Refresh fixture import" are the same grey button.
- **The header uses about 260px before any content.** Every page shows a full-width account banner with six switch pills on two rows, the nav, and a two-line demo-data strip. On a phone the switcher takes four rows and the nav wraps "Our public profile" onto its own line.
- **Navigation is not task-based.** "Private dashboard / Marketplace / Our public profile" has no entry for the listings a business has published or the offers it has received. The offers inbox is only reachable from a link inside an expense table row. Nested pages (listing → challenge, listing → inbox, offer → trace) have no back path.
- **The product has no identity.** The tab title is "Marketplace Demo", the favicon is empty, and "On the Fly" appears nowhere.
- **Explanations are paragraphs, not progressive disclosure.** Nearly every section opens with a sentence or two of rules. Each one is correct, but together they bury the figure or action the section exists for.

### Spend dashboard

- **The order is inverted.** First come a run-on connection sentence ("…Connected: fixture account fixture_apex_main"), then a separate Stripe panel, then a large duplicate-vendor box, then the spend summary. The expense table starts about 900px down on desktop and about 1,450px down on a phone.
- **Two connection UIs** (fixture import and Stripe sandbox) use different layouts, wording and refresh buttons.
- **Repeated badges and jargon crowd the table.** The same "source: fixture · demo data" pill repeats on every row, and "Recurrence 0%" exposes a raw confidence score. The table has seven columns, so on a phone Source, Visibility and Action scroll off-screen.
- **Selecting a row looks like it did nothing.** The detail panel renders below the table, off-screen, and is about 1,600px tall. The same 12 charges are listed twice, once as transactions and again under Spend signals, and every transaction repeats the provenance pill. Rows are clickable `<tr>`s with no keyboard access.
- **Fly-brain circuit names** ("Mushroom Body · FlyHash", "Compound Eye · novelty filter") and the "Fruit-fly-inspired circuits…" note appear several times per screen, in front of the owner.

### Publish flow

- **Demo defaults look like confirmed facts.** A pest-control expense opens pre-filled with "San Francisco Bay Area", 8000 sq ft, 4 bathrooms and "vacuum, trash, restrooms". The seeded landscaping listing publicly reads "8000 sq ft · 3x weekly · vacuum, trash, restrooms". This is a usability problem and also an honesty problem: unknown fields should stay explicit unanswered questions.
- **"1 / 2 / 3" are just labels.** The scope form, preview and publish button are all on one long page. Fourteen equal-weight inputs sit in a four-column grid, and editing silently clears the preview.
- **The preview leads with raw JSON and a payload hash**, not a picture of what a stranger will see.

### Marketplace and listing page

- **Cards have two same-weight text links**, "View listing" and "Challenge this price". Each card repeats "(price published by the business)", and the location appears in both the title and the scope line. The category filter has one option.
- **The listing page's main action** ("Challenge this price →") is an inline link at the end of a deadline sentence. It is shown even when the acting business owns the listing.

### Challenge form

- **The price placeholder "1875"** is grey text that reads as a filled-in value.
- **"Offer the full requested scope"** is a button embedded mid-sentence. Tri-state dropdowns ("Not stated") hide the choice, and long labels wrap in a five-column grid.
- **Nothing summarises what is about to be submitted** before clicking "Submit open offer".

### Offers inbox

- **The same offers appear twice**, first in the offers table and then in the comparison table, with the same prices and savings bullets.
- **The evidence column makes each row about 280px tall.** Every check is spelled out with timestamps and limitations inline.
- **No summary answers the owner's question**, "is anything here better than what I pay?"
- **Internal field names leak:** "offer does not cover requested scope: equipment_included".

## Design principles for this phase

1. **One primary action per screen**, visually dominant. Everything else is secondary or tucked into a menu.
2. **Answer first, evidence on demand.** Lead with the figure or decision. Move explanations into a "Why?" disclosure, tooltip or expandable row. Compress or deduplicate honesty labels, never delete them. Provenance, "potential" savings, "Modeled bid from public pricing — not a vendor quote", the bidding mode before submission, and not-run checks all stay visible.
3. **Private vs public is a visual state, not a sentence.** Use the same lock/globe icon and tone everywhere.
4. **Plain words first.** Implementation names (circuit names, `fixture_apex_main`, `registry stub`) go behind disclosure.
5. **Asymmetric risk, asymmetric controls.** Publishing stays a multi-step confirmation. Unpublishing stays one visible click and is never hidden in a menu.
6. **Dark mode is a token swap.** If a component needs `isDark` branching, a token is missing.

## Steps

### 1. Theme tokens and dark mode

- Add `frontend/src/shared/theme/` with a `tokens.css` file, a theme store (localStorage wrapped in try/catch, like `actingAccountStore`), a `ThemeProvider` and `useTheme` hook, and a `ThemeToggle` offering **Light / Dark / System**.
- Name tokens by meaning, not colour. This extends the convention `Pill.tsx` already uses. Tokens: `surface`, `surface-raised`, `surface-sunken`, `surface-code`, `text`, `text-muted`, `border`, `accent`, `focus-ring`, plus background/text/border for each tone (`neutral`, `info`, `success`, `warning`, `danger`, `simulated`, `private`). "Simulated" stays amber in both themes.
- Set `data-theme` on `<html>`. "System" follows `prefers-color-scheme` and updates live when the OS setting changes. Sync open tabs through the `storage` event, since theme is a device preference (unlike the acting business).
- A small inline script in `index.html` sets `data-theme` before React mounts, so a dark-mode user never sees a white flash on cold load.
- Set `color-scheme` per theme so native inputs, selects, date pickers and scrollbars follow it.
- Dark palette: a dark grey surface, not pure black. Check contrast of body text, muted text and every pill tone in both themes (4.5:1 for text, 3:1 for borders and focus rings).
- Business colours in `demoAccounts.ts` must remain legible in both themes. Render them as an avatar and accent, not as a full-width banner behind white text.
- Replace every hardcoded colour literal with a token, file by file. Add a small `npm run check:colors` script that fails on hex or `rgb()` literals outside `tokens.css`, so new ones don't creep back in. The documented exceptions are business identity colours and data-driven widths.

### 2. Styling approach and shared primitives

**Decision: CSS Modules plus the tokens above, with no new UI dependency.** Vite supports CSS Modules natively. A colocated `Component.module.css` keeps each feature owning its files ([codingrules](../.claude/codingrules.md) §2–3) and allows migration one component at a time. Tailwind would change every element's markup and add build configuration. A component library would bring its own theming to reconcile with the privacy-specific components. Inline styles remain only for truly dynamic values, such as the scope completeness bar width.

`shared/components/` already holds 8 files, past the split point in [codingrules](../.claude/codingrules.md) §3. Split it by concern as part of this step rather than adding a parallel folder:

- `controls/`: Button (primary, secondary, ghost, danger, loading), Input with prefix/suffix (`$`), Select, Checkbox, SegmentedControl (replaces `TriStateSelect` with Included / Not included / Not stated), Field (label, hint, error, "not stated" state).
- `layout/`: Card, PageHeader (title, one-line description, primary action, back link), Table (sticky header, hover, keyboard-selectable rows), Drawer/Sheet, Dialog, Tabs, Stepper.
- `feedback/`: existing `EmptyState`, `ErrorState`, `ErrorBoundary` and `LoadingSpinner` restyled (not rewritten), plus Toast (import complete, bidding mode changed), Skeleton, and Disclosure ("Why?").
- `labels/`: `Pill` (tones unchanged), `BiddingModePill`, `VisibilityBadge` promoted from dashboard since inbox and publish need it too, and `MoneyDisplay` with tabular numerals.

### 3. App shell

- **A compact top bar (~56px)** holds the product name, primary navigation, a demo-data status chip, the theme toggle, and the account menu.
- **Account menu.** A button shows the acting business's coloured avatar and full name at ≥18px, so it is still unmistakable on a projector (roadmap 09, "The account switch as a demo instrument"). It opens a list of businesses with Public visitor separated at the bottom. "View our public profile" moves here.
- **Task-based navigation:** **Spend** (private dashboard), **Listings** (the business's published and unpublished listings with offer counts, each linking to its inbox, derived from existing expense data), and **Marketplace**. **My offers** (offers this business has made) needs a new owner-scoped endpoint that never exposes other challengers, so it is optional.
- **Demo-data chip.** The strip becomes one chip that still states both facts on screen, e.g. "Fixture data · 3 simulated offers", in the simulated tone. Clicking expands the full explanation. When `/api/demo/status` fails, the chip turns danger-toned with "Data labels unavailable", never hidden (roadmap 09, "Honest labeling of the demo's seams").
- **Workflow vs places.** REBID's Progress → Market → Bid ([plan1](../plan/plan1.md), "UI and demo sequence"; [plan2](../plan/plan2.md) moves Fly after splitting) is a per-expense workflow, so it gets a Stepper inside the expense's REBID page, not top-level nav items.
- **Page chrome.** Use `PageHeader` on every page with a back link on nested routes. Set per-page document titles ("Spend · On the Fly"), a real favicon, and fix the "Marketplace Demo" title.
- **Phone.** The nav collapses behind a menu button, the account menu becomes a full-width sheet, and the page never scrolls horizontally.

### 4. Spend dashboard

- **Order:** stat tiles (annual tracked spend, private vs public count, data source label), then the expense list, then a collapsible **Data sources** card.
- **Data sources card.** One card lists each source on its own row with its provenance label, status, "last imported" time and its own refresh action. Fixture and Stripe stay separate components and separate labels; a synthetic ledger is never shown as Stripe data.
- **Duplicate vendors.** Replace the large box with an inline notice ("1 possible duplicate vendor · Review") that opens the merge panel and highlights the affected rows.
- **Table columns:** Vendor (with category), Annual cost (per-period beneath), Pattern ("Monthly · 12 payments"; confidence as Regular / Irregular / One-off, with the percentage in a tooltip), Visibility badge, and Action. Sort by annual cost descending so the largest expense, the natural REBID candidate, is first. Group payroll, tax and transfer rows at the bottom under "Never publishable", dimmed.
- **Provenance.** When every row shares one provenance, show it once in the table header ("All figures: fixture · demo data"). When sources are mixed, keep a badge on every row. Apply the same rule to the transaction list.
- **Money.** Stat tiles may round to whole dollars, with the exact amount in a tooltip, both derived from integer minor units. Table rows and detail views show exact amounts.
- **Row actions.** A private publishable row gets **Publish…** (later **REBID** as the primary per the plan). A public row gets **Offers (n)** plus a visible ghost **Unpublish** button that stays one click.
- **Row detail in a drawer.** Selecting a row opens a right-side drawer on desktop, or a full-screen sheet on a phone, instead of rendering below the table. Tabs: **Overview** (baseline sentence, period, annualized figure), **Transactions** (compact table with excluded rows marked), **Signals** (price changes and unusual charges only, with "Show all 12 charges" to expand). Rows are keyboard-selectable.
- **Phone.** The table becomes stacked cards showing vendor, annual cost, visibility and action.

### 5. Publish flow as a real stepper

- **Stepper:** **Scope → Preview → Publish**, showing one step at a time with Back/Next. A side card keeps the chosen expense in view: vendor, current price, cadence and source.
- **Remove silent defaults.** Pre-fill only the transaction baseline (price, cadence), labeled "From your transactions — confirm or correct". Every other field starts empty with an example placeholder. A visible "Fill with demo template" button may fill the rest for rehearsal.
- **Fields by category.** Replace the hard-coded cleaning form with a per-category field set, so pest control doesn't get "Bathrooms". The DevSecOps field set (labor mix, hours, location, clearance, classification) arrives with the P0 scope work. Group fields as **What you buy**, **Where**, **What you pay** (price, cadence, included costs) and **Bidding** (deadline, mode, vendor-name disclosure).
- **Gaps before price.** Show "3 questions unanswered" before moving to Preview. "Not stated" is a visible chip, distinct from empty.
- **Preview.** Render the draft projection with the same component the marketplace uses, so the preview is literally what a stranger sees. Place "Never public" beside it. Keep the exact JSON and payload hash one click away under "Show the exact payload the public API will serve", open by default on desktop for the privacy proof (roadmap 09, "The privacy proof").
- **Invalidated preview.** When an edit invalidates the preview, say so ("You changed the scope — preview again") instead of silently clearing it.
- **Publish.** The confirm button names the expense ("Publish Orkin Pest Control"). If the vendor name is opted in, show the incumbent-vendor warning right there. The success screen offers **Copy share link**, **View as a stranger** (new tab), and **Unpublish**.

### 6. Marketplace and listing page

- **Marketplace.** Show a responsive card grid. Each card has category and area, a large price per period, a one-line scope, and a badge row (bidding mode, "closes in 14 days", offer count). The whole card links to the listing, and it has a single **Challenge** button. State "prices published by the business" once in the page header. Build category chips from the categories present in the feed, and sort by newest, closing soon or price.
- **Listing page.** On desktop, use two columns. Left: scope as a definition list, with "Not stated" shown explicitly. Right: a sticky action card with the current price, bidding terms in one sentence with icon, the deadline, and the primary **Challenge this price** button. When the acting business owns the listing, replace the button with **Manage offers** linking to the inbox.
- **Leaderboard.** Keep scope completeness beside price. Reduce the ranking explanation to one line plus a "How ranking works" disclosure.
- **Similar listings.** Use compact cards at the bottom, with the match explanation behind "How was this matched?".

### 7. Challenge form

- **Layout.** On desktop, put the form on the left and a sticky **Your offer** summary on the right. The summary shows the price and frequency as entered, a requested-vs-offered checklist (covered / not covered / not stated for each requested term), what the bidding mode means for this offer, and the submit button. Keep the mode notice above the first field and in the submit label.
- **No client-side math.** Don't compute normalized monthly price or scope completeness in the frontend. The server's figures appear on the confirmation after submitting, so the summary can never disagree with the owner's ranking.
- **Sections:** **Price** (a `$`-prefixed input with an "e.g. 1,875" placeholder, billing frequency, setup fee), **What's covered** (one SegmentedControl row per requested term, with "Match everything requested" at the top of the section), **Terms** (minimum term, availability, site visit) and **Message**.
- **Confirmation card.** Show what the owner sees and what the public sees, with **Revise** and **Back to marketplace** actions.

### 8. Offers inbox

- **Summary strip.** Show the current price, offer count, top-ranked offer's potential savings (taken from the server's comparison ranking, never recomputed), bidding mode with its toggle, listing status with a one-click **Unpublish**, and the share link.
- **One ranked list, not two tables.** Pin "What you pay now" at the top, then offers in server rank order, keeping the earlier-scope and unranked group headings. Columns: Challenger (with provenance), Monthly, Scope covered (bar plus missing items in human labels via `scopeItemLabel`), Potential savings, Evidence.
- **Evidence column.** Show one chip per check, all named, including ones not run: "Platform data: matched · Identity: not checked · Registry: not connected". The full records (timestamps, limitations) move into the expanded row.
- **Expanded row:** savings assumptions, full evidence, revision history, the challenger's message, and "Where does this number come from?".

### 9. Copy and density pass

- **Shorten explanations.** Replace explanatory paragraphs with one line plus a "Why?" disclosure, and keep the rule text in the disclosure.
- **Timestamps.** Show relative times ("2 hours ago") with the absolute time on hover. Show dates alone where the time adds nothing.
- **Fly-brain attributions.** Badges use plain language ("Found by pattern matching"). The circuit name and "deterministic code, no AI model" appear in the disclosure, once per panel.
- **Jargon swaps:** "Recurrence 95%" → "Regular · 12 payments", "fixture account fixture_apex_main" → "Hackathon demo ledger", "registry stub" → "Business registry (not connected yet)".

### 10. Accessibility, responsiveness and verification

- **Focus.** A visible focus ring token in both themes. Every clickable row, card and menu is reachable and operable by keyboard.
- **Contrast** targets from step 1 hold in both themes.
- **Phone (390px).** No horizontal page scroll; tables become cards; drawers become sheets.
- **Motion.** Respect `prefers-reduced-motion` for drawers and toasts.
- **Verification.** No frontend test runner exists, so after each step `npm run build` must pass. Capture every core screen in light and dark at 1280px and 390px, comparing against the previous capture. A headless-browser screenshot script (as used for this walkthrough) or Playwright is sufficient.

## Sequencing

1. **Tokens, dark mode and primitives** (steps 1–2). Frontend-only; start alongside P0 so the new REBID screens are built on the system instead of restyled later.
2. **App shell** (step 3).
3. **Spend dashboard** (step 4), landing with the GovCon fixtures and REBID entry point.
4. **Publish flow** (step 5), landing with the DevSecOps scope fields.
5. **Marketplace, challenge and inbox** (steps 6–8), during P1's challenge payoff.
6. **Copy and accessibility** (steps 9–10), continuously, with a final pass before rehearsal.

Progress, Market (modeled pricing) and Fly screens are specified by the plan. They use these primitives from their first commit.

## Done when

- [x] Light, dark and system themes work on every screen with no flash on cold load, and the choice persists.
- [x] No hardcoded colour literals remain outside `tokens.css` and the documented exceptions; the check script enforces it.
- [ ] Buttons, inputs, tables, badges and dialogs come from shared primitives; primary, secondary and destructive actions are visually distinct.
- [x] The shell is compact, task-based and phone-usable, and the acting business is still unmistakable on a projector.
- [ ] Spend shows totals and the expense list above the fold; row detail opens in a drawer without duplicated charge lists.
- [ ] Publishing is a three-step flow with no silent demo defaults, a rendered public preview, and the exact payload one click away.
- [x] The inbox shows each offer once, in server rank order, with every evidence check named.
- [ ] Every honesty label from CLAUDE.md is still visible on its screen in both themes.
- [ ] Keyboard focus, contrast and 390px layouts are checked on every core screen.

## Watch out for

- **Don't delete an honesty label to reduce clutter.** Compress it, deduplicate it, or move its explanation into a disclosure. A table-level provenance label is valid only when every row shares that provenance.
- **Don't recompute money, normalized prices or scope completeness** in the frontend for a nicer summary. Show the server's numbers.
- **Don't mix a restyle with logic changes** in one diff ([codingrules](../.claude/codingrules.md) §5). Migrate component by component.
- **Don't hide Unpublish in an overflow menu.** It must remain instant.
- **"My offers" must never list or reveal other challengers**, and "Listings" must never appear for a public visitor.
- **Don't let the compact header make the account switch easy to miss.** It is the demo's strongest minute.
