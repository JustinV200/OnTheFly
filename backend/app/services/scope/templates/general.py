"""The fallback template for any category without its own: requirement rows and constraints only, no extra fields."""

from app.services.listings.types import PublicScopeField
from app.services.scope.templates.base import TemplateFieldsError


class GeneralTemplate:
    """A template with no category-specific fields."""

    def __init__(self, key: str) -> None:
        self.key = key
        self.label = key.replace("_", " ").strip().capitalize() or "Service"

    def parse_fields(self, raw: object | None) -> str | None:
        """Reject category fields, which this template can't validate."""

        if raw is not None:
            raise TemplateFieldsError(f"The '{self.key}' category has no template fields; describe the work as requirements")
        return None

    def public_fields(self, stored: str | None) -> list[PublicScopeField]:
        """Return nothing: this template stores no fields."""

        return []
