"""Describes the vendor-name codes FlyHash compared for alias suggestions, for the live fly-brain panel.
It replays names the index already encoded, with the same encoder and input size; captions never carry a name.
"""

from app.services.expenses.aliases.suggest import VENDOR_NAME_SHAPE, VendorAliasScan
from app.services.expenses.aliases.vendor_name import vendor_name_receptors
from app.services.flybrain import (
    MAX_SLOTS,
    BrainStimulus,
    FlyBrainComponent,
    SensoryInput,
    StimulusInput,
    build_brain_stimulus,
)

# Each suggested pair takes two slots, one per name, so this many pairs fill the replay.
PAIRS_IN_STIMULUS = MAX_SLOTS // 2
# Without suggestions, one slot per vendor name the index compared.
NAMES_IN_STIMULUS = MAX_SLOTS


def vendor_alias_stimulus(scan: VendorAliasScan) -> BrainStimulus | None:
    """Return the name codes behind the suggestions, or None when the index never ran.

    With suggestions: for each of the first PAIRS_IN_STIMULUS in returned order, the alias
    name then the canonical name. Without any: up to NAMES_IN_STIMULUS compared names in
    expense-id order, so the replay is stable between requests. Owner-only like the scan.
    """

    if not scan.did_index_run:
        return None

    if scan.suggestions:
        slots: list[list[StimulusInput]] = []
        for position, suggestion in enumerate(scan.suggestions[:PAIRS_IN_STIMULUS], start=1):
            slots.append([_name_input(f"Suggested pair {position} · first name", scan, suggestion.alias.expense_id)])
            slots.append(
                [_name_input(f"Suggested pair {position} · second name", scan, suggestion.canonical.expense_id)]
            )
    else:
        slots = [
            [_name_input(f"Vendor name {position}", scan, expense_id)]
            for position, expense_id in enumerate(sorted(scan.compared_names)[:NAMES_IN_STIMULUS], start=1)
        ]

    return build_brain_stimulus(
        "Duplicate vendor suggestions",
        [FlyBrainComponent.mushroom_body_flyhash],
        VENDOR_NAME_SHAPE.input_dim,
        slots,
    )


def _name_input(caption: str, scan: VendorAliasScan, expense_id: str) -> StimulusInput:
    # Every suggested expense was indexed, so its compared name is always present; the encoding
    # call is the one suggest_vendor_aliases indexed and queried with.
    return StimulusInput(
        sense=SensoryInput.olfactory,
        caption=caption,
        vector=vendor_name_receptors(scan.compared_names[expense_id], VENDOR_NAME_SHAPE.input_dim),
    )
