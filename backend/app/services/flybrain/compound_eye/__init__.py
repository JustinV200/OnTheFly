"""Compound Eye: fly-inspired change detection that decides when a signal moved enough to matter."""

from app.services.flybrain.compound_eye.adaptation import (
    AdaptationTrace,
    ContrastAdaptation,
    LevelShift,
    SampleResponse,
)

__all__ = ["AdaptationTrace", "ContrastAdaptation", "LevelShift", "SampleResponse"]
