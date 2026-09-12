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

## Seed demo state

```bash
cd backend
python -m app.cli.seed_demo
```

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
