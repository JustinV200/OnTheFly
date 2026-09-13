"""Selects the category template for a category key. The only place a concrete template is chosen."""

from app.services.scope.templates.base import CategoryTemplate
from app.services.scope.templates.cleaning import CleaningTemplate
from app.services.scope.templates.devsecops import DevSecOpsTemplate
from app.services.scope.templates.general import GeneralTemplate

# "cleaning" and "commercial_cleaning" name one category (see the marketplace category filter).
_TEMPLATES: dict[str, CategoryTemplate] = {
    "cleaning": CleaningTemplate(),
    "commercial_cleaning": CleaningTemplate(),
    "devsecops": DevSecOpsTemplate(),
}


def template_for(category: str | None) -> CategoryTemplate:
    """Return the category's template; a category without one gets the general template, never an error."""

    key = (category or "").strip().casefold()
    return _TEMPLATES.get(key) or GeneralTemplate(key or "service")
