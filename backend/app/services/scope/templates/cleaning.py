"""The commercial-cleaning template. Its fields are the scope_versions columns that predate templates, read in place.
It accepts no category_fields: storing cleaning facts in two places would let them disagree.
"""

from app.services.listings.types import PublicScopeField
from app.services.scope.templates.base import TemplateFieldsError


class CleaningTemplate:
    """Maps cleaning scope onto the existing columns (roadmap 12, step 2: "Cleaning maps onto the existing columns")."""

    key = "cleaning"
    label = "Commercial cleaning"

    def parse_fields(self, raw: object | None) -> str | None:
        """Reject category fields; cleaning scope is written through the existing scope columns."""

        if raw is not None:
            raise TemplateFieldsError("Cleaning scope uses the scope form's own fields, not category_fields")
        return None

    def public_fields(self, stored: str | None) -> list[PublicScopeField]:
        """Return nothing extra: the existing public columns already carry cleaning scope."""

        return []
