"""Replays the charges the Compound Eye read for the trace's counted marks, for the live fly-brain panel.
Owner-only like the trace itself; it adds visual pulses only when the detector actually ran.
"""

from collections.abc import Sequence

from app.models.transaction import Transaction
from app.services.expenses.baseline_charges import baseline_charges
from app.services.expenses.signals import charge_brain_stimulus
from app.services.flybrain import BrainStimulus
from app.services.trace.baseline_membership import BaselineMembership


def compound_eye_stimulus(vendor_transactions: Sequence[Transaction], membership: BaselineMembership) -> BrainStimulus | None:
    """Return visual pulses for the vendor's most recent charges, or None when the Compound Eye didn't run.

    Assumes vendor_transactions is the same group find_baseline_membership read. The Compound Eye is
    the only circuit behind the trace, so no olfactory (novelty) pulses are added here.
    """

    # baseline_charges is the rule find_baseline_membership mirrors from sync, so these are the rows the detector was given.
    return charge_brain_stimulus(
        "Baseline trace",
        baseline_charges(list(vendor_transactions)),
        did_novelty_run=False,
        did_compound_eye_run=membership.did_compound_eye_run,
    )
