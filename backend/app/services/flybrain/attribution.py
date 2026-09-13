"""Describes which fly-brain circuit produced a result, so every surface can label it.
Responses carry this attribution so the UI never shows fly-brain output without saying so.
"""

from enum import StrEnum

from pydantic import BaseModel


class FlyBrainComponent(StrEnum):
    """The fly-brain circuits a product feature can use."""

    compound_eye = "compound_eye"
    mushroom_body_novelty = "mushroom_body_novelty"
    mushroom_body_flyhash = "mushroom_body_flyhash"
    # The browser's whole-brain simulation itself (features/brainview), the one place a result is read off simulated
    # spikes rather than computed here: the fruit fly's opinion on an offer. Labelled a toy wherever it appears.
    whole_brain_simulation = "whole_brain_simulation"


COMPONENT_LABELS: dict[FlyBrainComponent, str] = {
    FlyBrainComponent.compound_eye: "Compound Eye",
    FlyBrainComponent.mushroom_body_novelty: "Mushroom Body · novelty filter",
    FlyBrainComponent.mushroom_body_flyhash: "Mushroom Body · FlyHash",
    FlyBrainComponent.whole_brain_simulation: "Whole-brain simulation",
}


class FlyBrainAttribution(BaseModel):
    """One circuit's role in a response, written for the person reading the UI."""

    component: FlyBrainComponent
    label: str
    role: str
    is_deterministic: bool = True


def attribute(component: FlyBrainComponent, role: str) -> FlyBrainAttribution:
    """Build an attribution with the component's standard display label."""

    return FlyBrainAttribution(component=component, label=COMPONENT_LABELS[component], role=role)
