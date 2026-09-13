"""Reads the Ways to save thresholds from config, once per computation, so every card prints the ones it used."""

from pydantic import BaseModel

from app.core.config import get_settings


class SavingsThresholds(BaseModel):
    """The rules a segment must meet to be suggested (plan2, "A segment is suggested when all of these hold")."""

    min_basis_points: int
    min_annual_minor: int
    min_suppliers: int
    lookback_years: int
    max_suggested_pieces_per_task: int


def current_thresholds() -> SavingsThresholds:
    """Return the thresholds in force; never adjusted per task or per demo."""

    settings = get_settings()
    return SavingsThresholds(
        min_basis_points=settings.savings_min_basis_points,
        min_annual_minor=settings.savings_min_annual_minor,
        min_suppliers=settings.savings_min_suppliers,
        lookback_years=settings.savings_lookback_years,
        max_suggested_pieces_per_task=settings.max_suggested_pieces_per_task,
    )
