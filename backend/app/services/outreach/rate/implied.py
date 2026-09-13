"""Calculates a listing's implied hourly rate from its disclosed price and published hours.
It deliberately has no access to private expenses, cost-basis rates, offers or historical award totals.
"""

from typing import Literal

from pydantic import BaseModel

from app.services.listings.types import PublicListingProjection


class ImpliedRate(BaseModel):
    """A public-data-only planning estimate, or the exact reason one cannot be calculated."""

    status: Literal["available", "unavailable"]
    reason: str | None
    currency: str
    billing_cadence: str
    price_minor: int | None
    total_hours: int | None
    rate_minor_per_hour: int | None


def implied_rate_from_projection(projection: PublicListingProjection) -> ImpliedRate:
    """Divide a disclosed period price by that period's published hours, using integer minor units.

    Every must-have row needs an hour estimate. Using a partial denominator would overstate the rate and make an
    invitation's price-to-beat misleading. Optional rows with hours are included; optional rows without hours do not
    prevent an estimate.
    """

    base = {
        "currency": projection.price_currency,
        "billing_cadence": projection.billing_cadence,
        "price_minor": projection.price_minor,
    }
    if not projection.price_disclosed or projection.price_minor is None:
        return ImpliedRate(
            status="unavailable",
            reason="Price is hidden; disclose it before sharing an implied rate.",
            total_hours=None,
            rate_minor_per_hour=None,
            **base,
        )
    if projection.price_minor <= 0:
        return ImpliedRate(
            status="unavailable",
            reason="The published price must be positive.",
            total_hours=None,
            rate_minor_per_hour=None,
            **base,
        )
    if not projection.requirements:
        return ImpliedRate(
            status="unavailable",
            reason="Add requirement hours before sharing an implied rate.",
            total_hours=None,
            rate_minor_per_hour=None,
            **base,
        )
    if any(requirement.priority == "must" and requirement.hours is None for requirement in projection.requirements):
        return ImpliedRate(
            status="unavailable",
            reason="Confirm hours for every must-have requirement first.",
            total_hours=None,
            rate_minor_per_hour=None,
            **base,
        )

    total_hours = sum(requirement.hours or 0 for requirement in projection.requirements)
    if total_hours <= 0:
        return ImpliedRate(
            status="unavailable",
            reason="Add requirement hours before sharing an implied rate.",
            total_hours=None,
            rate_minor_per_hour=None,
            **base,
        )

    # Amounts and hours are positive integers; adding half the denominator rounds to the nearest cent per hour.
    rate_minor_per_hour = (projection.price_minor + total_hours // 2) // total_hours
    return ImpliedRate(
        status="available",
        reason=None,
        total_hours=total_hours,
        rate_minor_per_hour=rate_minor_per_hour,
        **base,
    )
