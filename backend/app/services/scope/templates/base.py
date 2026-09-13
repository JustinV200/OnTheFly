"""Declares the category template interface: how one category validates its own scope fields and shows them publicly.
Each category lives in its own module; services/scope/templates/registry.py is the only place that picks one.
"""

from typing import Protocol

from app.services.listings.types import PublicScopeField


class TemplateFieldsError(ValueError):
    """Raised when category fields don't match the category's template."""


class CategoryTemplate(Protocol):
    """One category's scope template."""

    key: str
    label: str

    def parse_fields(self, raw: object | None) -> str | None:
        """Validate raw request fields and return the JSON to store, or None when the template has no fields."""

    def public_fields(self, stored: str | None) -> list[PublicScopeField]:
        """Render stored fields as label/value pairs for the public projection."""
