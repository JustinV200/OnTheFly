# GovCon demo ledger

Run `python -m app.cli.seed_govcon_demo` from `backend/` after `python -m alembic upgrade head`.
This adds GovCon Industries (`acc_govcon_1`) without resetting existing accounts, expenses, or Stripe connections.
Select **GovCon Industries** in the normal dashboard's company switcher.

The fixed March–August 2026 ledger has 30 posted USD debits: six monthly invoices per service.
Stable provider transaction IDs make repeat runs no-ops. Variation ranges from -1.5% to +1.5%,
with zero average offset. Dates are fixed to keep the hackathon dataset reproducible.
The normal importer has a two-year window; this ledger will need a deliberate date revision for future demos after that window.

| Service | Average monthly | Annualized |
|---|---:|---:|
| DevSecOps Support | $118,000 | $1,416,000 |
| Cybersecurity Support | $82,000 | $984,000 |
| Program Management | $62,000 | $744,000 |
| Facilities Services | $43,000 | $516,000 |
| Logistics Support | $32,000 | $384,000 |
| Total | $337,000 | $4,044,000 |

These exact values follow the requested monthly budgets, rather than forcing the earlier plan's approximate $4.03M total.
All invoices, suppliers, and amounts are synthetic. They are not actual public awards or Stripe bank history.
Category candidates reference the [Census 2022 NAICS classifications](https://www.census.gov/naics/?year=2022):
541512 (systems design), 541611 (management consulting), 561210 (facilities support), and 541614 (logistics consulting).
Mappings are illustrative candidates; public classifications do not substantiate the synthetic prices.
Each raw payload records its category reference and pricing basis. Source type remains `fixture`.

The script uses `FixtureSource` → `run_import` → normal `Transaction` rows → `sync_service_expenses`.
There is no separate dashboard or direct insertion of precomputed expense totals. All new expenses stay private.
