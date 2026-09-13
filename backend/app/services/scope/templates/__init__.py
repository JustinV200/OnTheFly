"""Category templates (roadmap 12, step 2): code-defined schemas, one module per category."""

from app.services.scope.templates.base import CategoryTemplate, TemplateFieldsError
from app.services.scope.templates.devsecops import DevSecOpsFields
from app.services.scope.templates.registry import template_for

__all__ = ["CategoryTemplate", "DevSecOpsFields", "TemplateFieldsError", "template_for"]
