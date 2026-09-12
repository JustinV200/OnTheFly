"""Labels the Compound Eye's part in the trace's counted / not-counted transaction marks.
The circuit chooses which charges form the current price, so the trace must say so, including when it didn't run.
"""

from app.services.expenses.baseline import BaselineBasis
from app.services.expenses.signals import NotAssessedReason
from app.services.flybrain import FlyBrainAttribution, FlyBrainComponent, attribute
from app.services.trace.baseline_membership import BaselineMembership

# Same wording as the spend-signals panel, so the dashboard and the trace describe one run identically.
# Kept local because spend_signals._compound_eye_attribution is private and that file is being refactored
# on another track; fold both into one shared helper once that refactor lands.
NOT_ASSESSED_EXPLANATIONS: dict[NotAssessedReason, str] = {
    NotAssessedReason.cadence_not_recurring: "Not run: this spend doesn't recur on a regular schedule",
    NotAssessedReason.too_few_charges: "Not run: fewer than 3 charges",
    NotAssessedReason.mixed_currency: "Not run: charges are in more than one currency",
    NotAssessedReason.amounts_too_variable: "Ran, but found no stable price: amounts differ from charge to charge",
}


def compound_eye_attribution(membership: BaselineMembership) -> FlyBrainAttribution:
    """Describe what the Compound Eye decided about the trace's counted rows, or why it didn't decide.

    Always returns an attribution: a circuit that could not run is listed with its reason, never omitted.
    """

    if membership.basis is None:
        return attribute(
            FlyBrainComponent.compound_eye,
            "Not run: this vendor has no posted charges, so nothing counts toward the baseline.",
        )
    if membership.basis is BaselineBasis.current_price_level:
        return attribute(
            FlyBrainComponent.compound_eye,
            "Separated real price changes from one-off charges and chose the charges the baseline counts.",
        )
    explanation = (
        NOT_ASSESSED_EXPLANATIONS[membership.not_assessed_reason]
        if membership.not_assessed_reason is not None
        else "Not run"
    )
    return attribute(
        FlyBrainComponent.compound_eye,
        f"{explanation}; the baseline is the plain average of the charges marked counted.",
    )
