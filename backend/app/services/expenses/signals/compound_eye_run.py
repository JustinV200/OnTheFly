"""Decides whether the Compound Eye detector actually read a charge series, from its price-level reading.
Only a series the detector ran over may be replayed as its visual input; a series it refused may not.
"""

from app.services.expenses.signals.price_levels import NotAssessedReason, PriceLevelAnalysis


def did_compound_eye_run(price_levels: PriceLevelAnalysis) -> bool:
    """Return True when the detector ran over the charges, whether or not it found a stable price.

    analyze_price_levels checks cadence, charge count, and currency first and returns
    cadence_not_recurring, too_few_charges, or mixed_currency without reading a single
    amount; no_posted_charges means there was nothing to read. amounts_too_variable is
    decided only after the detector ran, so that reading counts as a run that found no price.
    The rule lists the ran cases rather than the refusals, so a reason added later reads as
    "did not run" until someone decides otherwise, instead of claiming a run by default.
    """

    return price_levels.is_assessed or price_levels.not_assessed_reason is NotAssessedReason.amounts_too_variable
