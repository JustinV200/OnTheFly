"""Drops the application schema and rebuilds it through Alembic, so demo state always matches migrations.
It drops only tables the app's models declare, plus Alembic's own version table, never anything else in the database.
"""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, text

import app.models as models_registry
from app.db.base import Base

BACKEND_DIR = Path(__file__).resolve().parents[3]


def reset_schema(engine: Engine) -> None:
    """Drop every model table and alembic_version, then upgrade to head.

    alembic_version must go too: drop_all leaves it at head, and Alembic would then skip every
    migration and leave the database with no tables (the failure mode on a deployed Postgres).
    """

    # Importing the models package registers every table on Base.metadata before the drop.
    _ = models_registry
    Base.metadata.drop_all(bind=engine)
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
    engine.dispose()

    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(config, "head")
