# On the Fly design system

Plain CSS custom properties plus small typed React primitives. No CSS-in-JS, no UI kit, no Tailwind. The reference is a prediction-market app (Kalshi): a "task market" where every listing reads like a market card, the price is the biggest thing on the screen, and the one action is obvious. Neutral surfaces, one green accent for actions, status colours only where a state means something, and a light and a dark theme that swap tokens, never components.

## Where things live

| Path | What it is |
|---|---|
| `styles/tokens.css` | Type sizes, spacing, radii, durations, layout, and the breakpoint list. Values only, the same in both themes. |
| `styles/themes/light.css`, `styles/themes/dark.css` | Every colour role and shadow, per theme. The only files allowed to contain colour literals (`npm run check:colors`). Contrast is checked by `npm run check:contrast`. |
| `styles/base.css` | Element defaults (body, headings, links, focus ring, bare buttons/inputs/tables, reduced motion). All wrapped in `:where()`, so zero specificity. |
| `styles/utilities.css` | `.ui-num`, `.ui-money`, `.ui-text-muted`, `.ui-text-sm`, `.ui-text-xs`, `.ui-eyebrow`, `.ui-visually-hidden`, `.ui-truncate`. |
| `index.ts` | The public surface. Import primitives from here only. |

`main.tsx` imports the global stylesheets once. Each primitive imports its own CSS. The theme (`shared/theme`) sets `data-theme` on `<html>`; an inline script in `index.html` does it before first paint so dark mode never flashes white.

```tsx
import { Button, ButtonLink, Card, Cluster, Field, Input, PageHeader, Stack, Stat, Table } from '../../shared/ui';
```

## Tokens

Use the semantic roles, not the raw scales.

- **Surfaces:** `--color-canvas` (page), `--color-surface` (cards), `--color-surface-raised` (menus, popovers), `--color-surface-subtle`, `--color-surface-sunken` (tracks, search fields), `--color-surface-hover`, `--color-surface-selected`, `--color-backdrop` (behind a drawer).
- **Inverse pair:** text drawn on a `--color-text` fill uses `--color-canvas` (they invert in both themes). Text on `--color-brand` uses `--color-on-brand` (white in light, near-black in dark), never `--color-text-inverse`.
- **Text:** `--color-text`, `--color-text-secondary`, `--color-text-muted` (captions; passes 4.5:1 on canvas and surface), `--color-text-subtle` (placeholders and disabled only), `--color-text-link`.
- **Borders:** `--color-border-subtle` (row dividers), `--color-border` (cards), `--color-border-strong`, `--color-border-control` (inputs).
- **Brand (green):** `--color-brand`, `--color-brand-hover`, `--color-on-brand`, `--color-brand-soft` + `--color-brand-soft-border` + `--color-brand-text` (tints). Primary actions, links, focus, active nav, selection. Not for fly-brain output.
- **Status:** `--color-{success|warning|danger|info|simulated|private|neutral|flybrain}-{text|bg|border}` plus `-solid` for success/warning/danger/info/simulated/flybrain. Always use a tone's own text, bg, and border together. `flybrain` (violet) is only for fly-brain output.
- **Charts:** `--color-chart-line`, `--color-chart-fill`, `--color-chart-reference` (the current-price line), `--color-chart-grid`.
- **Type:** `--text-2xs` 11 · `--text-xs` 12 · `--text-sm` 13 · `--text-md` 15 (body) · `--text-lg` 17 · `--text-xl` 20 · `--text-2xl` 24 · `--text-3xl` 30 · `--text-4xl` 36 · `--text-5xl` 48 (a listing's market price). Weights `--weight-regular|medium|semibold|bold`.
- **Space:** `--space-1` 4px … `--space-16` 64px on a 4px grid (1, 2, 3, 4, 5, 6, 8, 10, 12, 16).
- **Radii:** `--radius-sm` 6 · `md` 10 (controls) · `lg` 14 (cards, callouts, tables) · `xl` 18 · `pill` (chips, segmented controls, search).
- **Shadows:** `--shadow-xs` (cards, controls) · `sm` (primary buttons) · `md` · `lg` (popovers). Focus: `--focus-ring`.
- **Motion:** `--duration-fast|base|slow`, `--ease-standard`. Reduced motion is handled globally.
- **Breakpoints** (literal in media queries, mobile-first): `480px` large phone · `768px` tablet, shell goes desktop · `1024px` laptop, inline nav · `1280px` desktop/projector.

Don't hard-code a hex value or a pixel size in a screen. If a token is missing, add it to `tokens.css` in the same change.

## Primitives

| Primitive | Use it for | Key props |
|---|---|---|
| `PageHeader` | The page's one `h1`, with eyebrow, subtitle, status badges (`meta`), and actions | `title`, `eyebrow`, `subtitle`, `meta`, `actions` |
| `Card` | A bordered group with an optional header row | `title`, `titleLevel` (2 default), `description`, `actions`, `tone` (`default`/`subtle`/`outlined`), `padding`, `as` |
| `Stack` / `Cluster` / `Grid` | Vertical rhythm, wrapping rows, responsive columns. Use these, not inline flex styles | `gap` (space step), `align`, `justify`; `Grid minItemWidth="220px"` |
| `Button` | Commands. Defaults to `type="button"`; pass `type="submit"` in forms | `variant` (`primary`/`secondary`/`ghost`/`danger`/`link`), `size` (`sm`/`md`/`lg`), `isBusy`, `disabled`, `iconStart`/`iconEnd` |
| `ButtonLink` | Navigation that is the main action ("Challenge this price") | react-router `Link` props plus `variant`, `size` |
| `Stat` | A headline figure with label, unit, and caption | `label`, `value`, `unit`, `caption`, `size` (`md`/`lg`/`xl`), `tone` (`default`/`success`/`danger`) |
| `Table` | Any tabular data | `label` (required), `minWidth`, `layout` (`scroll`/`stack`), `isInteractive`, `density`, `caption` |
| `Badge` | A short state or origin label | `tone`, `icon`, `size`, `title` |
| `Callout` | Terms, warnings, results, failures | `tone`, `title`, `titleLevel` (3 default), `role`, `actions`, `icon` |
| `Field` | Label + hint + error around one control; wires `id`, `aria-describedby`, `aria-invalid` | `label`, `hint`, `error`, one child control |
| `Input` / `Select` / `Textarea` | Native controls, styled. They stay native, so form-level `onChange` handlers still hear them | native props |
| `Checkbox` / `Radio` | Labelled choices with an optional consequence hint | `label`, `hint`, native props. Group radios in a `<fieldset>` with a `<legend>` |
| `Skeleton` / `Spinner` | Loading placeholders. Always beside a named `role="status"` label | `width`, `height`, `shape` / `size` |
| `Icon` | Decorative 24-grid icons (drawings in `icons/iconPaths.tsx`): alerts, arrows, check, chevrons, clock, copy, external-link, eye, globe, info, lock, mail, menu, monitor, moon, plus, search, send, sun, trending-down, users, x, and the filled `fly` | `name`, `size` |
| `SegmentedControl` | Two to four short, mutually exclusive choices shown at once (Included / Not included / Not stated; Sealed / Open). Radio semantics, arrow keys | `label`, `options`, `value` (null = unanswered), `onChange`, `size` |
| `FilterChips` | A scrolling pill row that filters a list (market categories, sort) | `label`, `chips` (`value`, `label`, `count`), `value`, `onChange` |
| `Tabs` | Views of one thing (Overview / Transactions / Signals). Only the active panel renders | `label`, `tabs` (`id`, `label`, `meta`, `content`), optional controlled `activeId`/`onChange` |
| `Disclosure` | "Why?" and "How ranking works": the explanation behind a label, never the label itself | `summary`, `variant` (`inline`/`card`), `isDefaultOpen` |
| `Drawer` | Row detail without leaving the list: right panel on desktop, full-screen sheet on phones | `isOpen`, `onClose`, `title`, `description`, `footer`, `width` |
| `CopyButton` | Copy a share link, with a visible fallback if the clipboard is refused | `value`, `label`, `variant`, `size` |
| `TermHint` | A jargon word explained in one plain sentence ("Keep cost", "Remainder"): dotted underline, focusable, tooltip on hover or focus, announced as the term's description. Explains a word; never hides an honesty label | `hint`, children (the term) |
| `useFocusOnRequest` | A button elsewhere on the page ("Review offers") scrolls to a region and moves focus there once that region has loaded, exactly once | `ref`, `isRequested`, `isReady`, `onHandled` |

Button emphasis: one `primary` per view (publish, submit offer, challenge). Everything else is `secondary`. `ghost` is for low-emphasis toolbar actions. `danger` is only for destructive, hard-to-undo actions. **Unpublish is the safe direction, so it is `secondary`, never `danger`.** While a request is in flight pass `isBusy` and change the label ("Publishing…").

## Patterns

### Money

- Always render amounts with `MoneyDisplay` (`shared/components/MoneyDisplay`). It carries `.ui-money`: tabular numerals, no line break inside the amount.
- The figure a screen is about goes in a `Stat` (`size="xl"` for the one headline number, `lg` for summary rows). Put the period in `unit` ("/ month") and provenance in `caption`.
- In tables, numeric cells get `className="ui-num"` on both `th` and `td`; they right-align.
- Savings: label them **"Potential savings"** and keep assumptions and the "provisional" note visible in the caption or right under the figure, never in a tooltip. `tone="success"` on a savings Stat is allowed because the words say it too.
- Scope before price: wherever offers are compared, put `ScopeCompleteness` (or the scope gap badges) beside the price in the same row, never in a later column the eye reaches second.

### Provenance

- Every figure and offer shows `ProvenanceBadge` (`shared/provenance/ProvenanceBadge`) right beside it: in the Stat `caption`, in the same table row, or in the card header `actions`. Never behind a disclosure, never removed to save space.
- The `simulated` tone (orange) means demo data. Don't use it for anything else.
- Fly-brain output always carries `FlyBrainBadge`, and a panel built from it ends with `FlyBrainNote`. The `brand` tone is reserved for these.

### Visibility and bidding status

- Visibility (`VisibilityBadge`) and bidding mode (`BiddingModePill`) go in `PageHeader meta` or the `Card` header, so they are read before any action.
- Private is a strong neutral (`private` tone, lock icon); public is `success`. Words are always present.
- Bidding terms on a bid form: the mode pill in the page header, and **one** full-sentence explanation next to the submit button, where the bidder decides. Don't repeat it above the price field; a mode change while the bidder types gets its own `Callout role="alert"`.
- Leaderboards: rank, price, **scope completeness in the adjacent column**, time, origin. No bidder identity column, ever.
- Say "bidder" and "business" in visible copy, not "challenger" and "owner" (the code keeps its `challenge` names).

### Forms

```tsx
<form onSubmit={submit}>
  <Stack gap={5}>
    <Grid minItemWidth="220px">
      <Field label="Your price ($)" hint="Per billing period, before tax" error={priceError}>
        <Input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} />
      </Field>
      <TriStateSelect label="Supplies" value={supplies} onChange={setSupplies} />
    </Grid>
    <fieldset>
      <legend>Bidding mode</legend>
      <Radio name="mode" label="Sealed (default)" hint="The public sees only how many offers exist" checked={...} onChange={...} />
    </fieldset>
    <Cluster justify="end">
      <Button type="submit" variant="primary" size="lg" isBusy={isSubmitting}>Submit sealed offer</Button>
    </Cluster>
  </Stack>
</form>
```

- Every control has a visible label. Hints explain consequences ("Blank means not stated"). A validation error goes in `Field error` or a `Callout tone="danger" role="alert"` above the submit button.
- Disabled submit buttons say why in their label or right beside them.

### Loading, empty, error, success

- Loading: `LoadingSpinner label="Loading offers…"` (named status plus skeleton lines). Never a bare "Loading…" text or a blank area.
- Empty: `EmptyState title=… action=…` explaining why empty is normal and what to do next. Use a `ButtonLink` for the action when it is the obvious next step.
- Error: `ErrorState title=… error=… onRetry=…`. A failed background refresh that still shows old data gets an `ErrorState` above the stale content, titled to say the data is stale.
- Success after an action: `Callout tone="success" role="status"` with what happened, in words.
- Disabled: `disabled` on the control, plus a reason in text.

### Tables and responsiveness

```tsx
<Table label="Your expenses" minWidth="760px" isInteractive>
  <thead><tr><th>Vendor</th><th className="ui-num">Annualized</th><th>Source</th></tr></thead>
  <tbody>
    <tr className={isSelected ? 'is-selected' : undefined} onClick={…}>
      <td data-label="Vendor">…</td>
      <td className="ui-num" data-label="Annualized"><MoneyDisplay … /></td>
      <td data-label="Source"><ProvenanceBadge … /></td>
    </tr>
  </tbody>
</Table>
```

- `layout="scroll"` (default): the table scrolls inside its own bordered container; the page never scrolls sideways. Set `minWidth` to where columns stop being readable.
- `layout="stack"`: below 640px each row becomes a card of label/value pairs. Every `td` then needs `data-label`. Prefer `stack` for tables people read on phones (leaderboard, offers); keep `scroll` for dense owner tables.
- Clickable rows still need a real button or link inside for keyboard users.
- Check every screen at 390px: no horizontal page scroll. Long words wrap (`overflow-wrap: anywhere` is already on page titles).

### Headings and accessibility

- Page: `PageHeader` renders the `h1`. Sections: `Card title` at level 2. Nested: level 3. `EmptyState` and `ErrorState` titles are `h3`.
- Focus rings are global; never remove `outline` without replacing it.
- Icons are decorative. State is always carried by words (badges, callout titles, button labels), never by colour alone.

### Dark mode

- Every colour comes from a role token, so a component never branches on the theme. If something looks wrong in one theme, a role is missing or misused: fix the token, not the component.
- Never write a colour literal outside `styles/themes/` (business identity colours in `demoAccounts.ts` are the documented exception). `npm run check:colors` fails the build step otherwise.
- Check both themes at 1280px and 390px before calling a screen done.

### Market look (task market)

- A listing is a market card: category and area as the title, the current price as the big number with its period, one line of scope, then a meta row (bidding mode, offers, closes in). The whole card links to the listing; there is exactly one button on it.
- The listing page is a market page: the price headline, the offer chart or the sealed panel, tabs for scope, leaderboard and rules, and a sticky ticket on the right with the one action.
- Money is the largest text on a screen; labels are small and muted; numbers use `.ui-money`/`.ui-num`.

## Not built yet

Dialog and toast. Add them here, as primitives with their own CSS, when a screen needs one.
