# Backend

Local FastAPI backend for the spend-transparency marketplace demo.

## Setup

```bash
cd backend
python -m pip install -e '.[dev]'
cp .env.example .env
```

## Database

```bash
cd backend
alembic upgrade head
python - <<'PY'
from app.db.session import get_session_factory
from app.db.seed import run_seed

db = get_session_factory()()
try:
    run_seed(db)
finally:
    db.close()
PY
```

## Reset demo state

One command drops the schema, rebuilds it through Alembic, and reseeds a known state. Run it before every rehearsal.

```bash
cd backend
python -m app.cli.seed_demo                      # live: accounts + fixture transactions, everything private, nothing published
python -m app.cli.seed_demo --scenario staged    # the cleaning listing already public with offers (rehearse later steps, or recover)
python -m app.cli.seed_demo --confirm-remote     # required when DATABASE_URL is not SQLite (e.g. the deployed Postgres)
```

`staged` publishes Apex's cleaning listing sealed. Bay Clean then makes a sealed $1,875 offer, the owner opens bidding, and Golden Gate makes an open $1,950 offer. That leaves Summit Building Services free to underbid live, and it shows that a sealed offer stays sealed after bidding opens. Every seeded offer is labeled `demo_data`.

### Genuine counteroffers survive every reset

Before anything is dropped, the command copies every genuine offer (`challenger_submitted` or `captured_off_platform`, from a non-seeded account) into `backend/demo_data/genuine_counteroffers.json`, then writes that file atomically. The file is gitignored because it can hold a real business's terms. `staged` restores each offer with its original provenance, bidding mode, and timestamps. `live` keeps the offers in the ledger, because the listing they attach to doesn't exist until the owner publishes it.

If reading those offers fails (a locked database, a dropped connection, a timeout), the command prints the error, exits 1, and drops nothing. Rerun it once the database is reachable. Only a database with no `challenges` table yet counts as a first run with nothing to capture, and the summary reports that as `schema_missing_before_reset: true`.

To enter a quote received off the platform, add an entry to the ledger by hand, then run `--scenario staged`:

```json
{
  "version": 1,
  "entries": [
    {
      "account": { "id": "acc_<business>", "handle": "<business-handle>", "business_name": "<Legal business name>",
                   "service_area": "<City, ST>", "created_at": "<when they first engaged, ISO 8601>" },
      "offer": { "provenance": "captured_off_platform", "bidding_mode_at_submission": "sealed",
                 "price_minor": 190000, "price_currency": "USD", "billing_frequency": "monthly",
                 "scope_included": ["vacuum", "trash", "restrooms", "3x weekly"], "minimum_term": "<as stated>",
                 "site_visit_required": true, "submitted_at": "<actual time the quote arrived, ISO 8601 with zone>" },
      "original_evidence": "<where the original email/notes are kept>"
    }
  ]
}
```

Validation rejects an off-platform entry with no `original_evidence`, or one marked `open` (such a quote was never shown bidding terms). Keep hedges verbatim. "Around $1,900, depends on a walkthrough" goes in as `site_visit_required: true` plus the wording in `other_conditions`.

## Pre-demo preflight

A read-only check of the deployed stack. It covers API health, public reads with no account header, demo data seeded, whether a genuine offer exists, CORS for the frontend origin, and a profile deep link surviving a refresh. Items only a person can check print as MANUAL.

```bash
cd backend
python -m app.cli.preflight --api https://<api-host> --frontend https://<frontend-host>
```

It exits non-zero if any automated check fails.

## Run tests

```bash
cd backend
pytest
```

## Start server

```bash
cd backend
uvicorn app.main:app --reload
```
