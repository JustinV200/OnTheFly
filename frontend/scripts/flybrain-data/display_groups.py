"""Assigns every neuron to one display group (smell receptors, mushroom body, optic lobes...) from its annotations.
Groups only colour, label and summarise the picture; the simulation never reads them.
"""

from dataclasses import dataclass

import numpy as np
import pandas as pd

# Neurons the annotation table doesn't cover get this group and are simulated but not drawn.
UNPLACED_GROUP_ID = 255


@dataclass(frozen=True, slots=True)
class DisplayGroup:
    """A named set of neurons shown together in the brain view and the activity strip."""

    group_id: int
    key: str
    label: str


# Order is the order the activity strip lists them: the smell pathway, then vision, then the rest.
# Labels name cell classes rather than brain regions, because an annotation's anchor point sits on the neuron's
# backbone and a long neuron (a projection neuron, say) crosses several regions.
GROUPS: tuple[DisplayGroup, ...] = (
    DisplayGroup(0, "smell_receptors", "Smell receptor neurons"),
    DisplayGroup(1, "antennal_lobe", "Antennal lobe neurons"),
    DisplayGroup(2, "mushroom_body", "Mushroom body neurons"),
    DisplayGroup(3, "lateral_horn", "Lateral horn neurons"),
    DisplayGroup(4, "photoreceptors", "Photoreceptors"),
    DisplayGroup(5, "optic_lobes", "Optic lobe neurons"),
    DisplayGroup(6, "central_complex", "Central complex neurons"),
    DisplayGroup(7, "descending_motor", "Descending and motor neurons"),
    DisplayGroup(8, "other", "Other neurons"),
)

ANTENNAL_LOBE_CLASSES = frozenset({"ALPN", "ALLN", "ALIN", "ALON"})
MUSHROOM_BODY_CLASSES = frozenset({"Kenyon_Cell", "MBON", "DAN", "MBIN"})
LATERAL_HORN_CLASSES = frozenset({"LHLN", "LHCENT"})
OPTIC_SUPER_CLASSES = frozenset({"optic", "visual_projection", "visual_centrifugal"})
DESCENDING_SUPER_CLASSES = frozenset({"descending", "motor"})


def assign_display_groups(annotations: pd.DataFrame) -> np.ndarray:
    """Return a uint8 group id per annotation row, in row order.

    Expects the annotation columns super_class and cell_class. Rules are checked most specific first, so a
    sensory olfactory neuron is a smell receptor, never "other". Rows with no super_class are unplaced.
    """

    super_class = annotations["super_class"].fillna("")
    cell_class = annotations["cell_class"].fillna("")
    groups = np.full(len(annotations), 8, dtype=np.uint8)

    groups[super_class.isin(DESCENDING_SUPER_CLASSES).to_numpy()] = 7
    groups[(cell_class == "CX").to_numpy()] = 6
    groups[super_class.isin(OPTIC_SUPER_CLASSES).to_numpy()] = 5
    groups[((super_class == "sensory") & (cell_class == "visual")).to_numpy()] = 4
    groups[cell_class.isin(LATERAL_HORN_CLASSES).to_numpy()] = 3
    groups[cell_class.isin(MUSHROOM_BODY_CLASSES).to_numpy()] = 2
    groups[cell_class.isin(ANTENNAL_LOBE_CLASSES).to_numpy()] = 1
    groups[((super_class == "sensory") & (cell_class == "olfactory")).to_numpy()] = 0
    groups[(super_class == "").to_numpy()] = UNPLACED_GROUP_ID
    return groups


def group_anchors(positions_nm: np.ndarray, groups: np.ndarray, sides: np.ndarray) -> list[dict[str, object]]:
    """Return each group's label anchors: the mean position of its neurons on each side of the brain.

    One anchor per side, because the midpoint of a bilateral group (the two optic lobes) lands in the middle of the
    brain, where none of its neurons are. The viewer decides which side's label to draw.
    """

    described: list[dict[str, object]] = []
    for group in GROUPS:
        members = groups == group.group_id
        anchors = []
        for side in ("left", "right"):
            on_side = members & (sides == side)
            if not on_side.any():
                continue
            centre = positions_nm[on_side].mean(axis=0)
            anchors.append({"side": side, "position_nm": [round(float(value)) for value in centre]})
        described.append(
            {
                "id": group.group_id,
                "key": group.key,
                "label": group.label,
                "count": int(members.sum()),
                "anchors": anchors,
            }
        )
    return described
