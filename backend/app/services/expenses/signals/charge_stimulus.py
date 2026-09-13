"""Replays the charges a vendor's fly-brain circuits read as a brain stimulus, one slot per charge.
Olfactory pulses are the novelty filter's own receptor codes; visual pulses present the amounts the Compound Eye read.
It reads no data beyond the charges passed in and changes no reading.
"""

from collections.abc import Sequence

from app.models.transaction import Transaction
from app.services.expenses.signals.charge_novelty import CHARGE_SHAPE
from app.services.expenses.signals.charge_receptors import (
    charge_amount_receptors,
    charge_description_receptors,
    compound_eye_amount_receptors,
)
from app.services.expenses.signals.price_levels import is_price_level_charge
from app.services.flybrain import (
    MAX_SLOTS,
    BrainStimulus,
    FlyBrainComponent,
    SensoryInput,
    StimulusInput,
    build_brain_stimulus,
    merge_vectors,
)

# One slot per charge, so a replay holds the most recent charges that fit.
MAX_CHARGES_IN_STIMULUS = MAX_SLOTS


def charge_brain_stimulus(
    result_label: str,
    charge_transactions: Sequence[Transaction],
    did_novelty_run: bool,
    did_compound_eye_run: bool,
) -> BrainStimulus | None:
    """Build pulses for the most recent MAX_CHARGES_IN_STIMULUS charges, oldest of those first.

    charge_transactions must be the exact rows the circuits were given (baseline_charges'
    selection). Each slot is captioned "Charge K of M", with K the position among the
    included charges and M how many are included; the caption never carries an amount or
    description. Olfactory pulses need the novelty filter to have run over these rows,
    and visual pulses need the Compound Eye to have run (see did_compound_eye_run). Returns
    None when neither circuit ran.
    """

    circuits: list[FlyBrainComponent] = []
    if did_compound_eye_run:
        circuits.append(FlyBrainComponent.compound_eye)
    if did_novelty_run:
        circuits.append(FlyBrainComponent.mushroom_body_novelty)
    if not circuits:
        return None

    # Same order score_charge_novelty and analyze_price_levels read the charges in.
    ordered = sorted(charge_transactions, key=lambda transaction: (transaction.posted_at, transaction.id or ""))
    included = ordered[-MAX_CHARGES_IN_STIMULUS:]
    slots = [
        _charge_slot(transaction, f"Charge {position} of {len(included)}", did_novelty_run, did_compound_eye_run)
        for position, transaction in enumerate(included, start=1)
    ]
    # Both encoders use the novelty filter's input size, so every pulse shares one receptor space.
    return build_brain_stimulus(result_label, circuits, CHARGE_SHAPE.input_dim, slots)


def _charge_slot(
    transaction: Transaction,
    caption: str,
    did_novelty_run: bool,
    did_compound_eye_run: bool,
) -> list[StimulusInput]:
    inputs: list[StimulusInput] = []
    if did_novelty_run:
        # Exactly the codes score_charge_novelty tagged for this charge: it skips the amount
        # code for a zero amount, so the replay does too.
        vectors = [charge_description_receptors(transaction, CHARGE_SHAPE.input_dim)]
        if transaction.amount_minor > 0:
            vectors.insert(0, charge_amount_receptors(transaction, CHARGE_SHAPE.input_dim))
        inputs.append(StimulusInput(sense=SensoryInput.olfactory, caption=caption, vector=merge_vectors(*vectors)))
    # The detector skips refunds and zero rows, so those charges get no visual pulse even when it ran.
    if did_compound_eye_run and is_price_level_charge(transaction):
        inputs.append(
            StimulusInput(
                sense=SensoryInput.visual,
                caption=caption,
                vector=compound_eye_amount_receptors(transaction, CHARGE_SHAPE.input_dim),
            )
        )
    return inputs
