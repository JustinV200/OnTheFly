"""Persists each market-data retrieval as a MarketEvidence row, so a card can name exactly what it read."""

from sqlalchemy.orm import Session

from app.models.savings import MarketEvidence
from app.services.market_data.source import LaborRateRetrieval, SupplierRetrieval


def record_supplier_retrieval(task_id: str, retrieval: SupplierRetrieval, db: Session) -> MarketEvidence:
    """Stage one award retrieval with its query, status, records and limitations."""

    row = MarketEvidence(
        task_id=task_id,
        kind="suppliers",
        source=retrieval.source,
        provenance=retrieval.provenance,
        query_json=retrieval.query.model_dump_json(),
        retrieved_at=retrieval.retrieved_at,
        status=retrieval.status,
        result_json=retrieval.model_dump_json(include={"records"}),
        limitations=retrieval.limitations,
    )
    db.add(row)
    return row


def record_rate_retrieval(task_id: str, retrieval: LaborRateRetrieval, db: Session) -> MarketEvidence:
    """Stage one labor-rate retrieval with its matched categories and sample."""

    row = MarketEvidence(
        task_id=task_id,
        kind="labor_rates",
        source=retrieval.source,
        provenance=retrieval.provenance,
        query_json=retrieval.query.model_dump_json(),
        retrieved_at=retrieval.retrieved_at,
        status=retrieval.status,
        result_json=retrieval.model_dump_json(include={"matched_labor_categories", "rates_minor_per_hour"}),
        limitations=retrieval.limitations,
    )
    db.add(row)
    return row
