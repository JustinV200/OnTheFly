"""The DevSecOps category template: typed fields stored in scope_versions.category_fields (roadmap 12, step 2).
Staffing lives on requirement rows (labor category and hours); these fields carry the context bidders price against.
"""

import json
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.services.listings.types import PublicScopeField
from app.services.scope.templates.base import TemplateFieldsError

_WORK_MODEL_LABELS = {"on_site": "On site", "hybrid": "Hybrid", "remote": "Remote"}


class DevSecOpsFields(BaseModel):
    """What a DevSecOps scope states beyond its requirement rows. Unset fields are unanswered, not empty."""

    # Extra keys are rejected, so a typo can't store a field no one validates or displays.
    model_config = ConfigDict(extra="forbid")

    mission_summary: str | None = Field(default=None, max_length=1000)
    environments: list[str] = Field(default_factory=list)
    compliance_frameworks: list[str] = Field(default_factory=list)
    period_of_performance_months: int | None = Field(default=None, gt=0, le=120)
    work_model: Literal["on_site", "hybrid", "remote"] | None = None


class DevSecOpsTemplate:
    """Validates and renders DevSecOps category fields."""

    key = "devsecops"
    label = "DevSecOps"

    def parse_fields(self, raw: object | None) -> str | None:
        """Return the validated fields as JSON; raises TemplateFieldsError for anything the schema rejects."""

        if raw is None:
            return None
        try:
            fields = DevSecOpsFields.model_validate(raw)
        except ValidationError as error:
            raise TemplateFieldsError(f"DevSecOps scope fields are invalid: {error.errors()[0]['msg']}") from error
        return fields.model_dump_json()

    def public_fields(self, stored: str | None) -> list[PublicScopeField]:
        """Return each answered field as a label/value pair, in a fixed order."""

        if not stored:
            return []
        fields = DevSecOpsFields.model_validate(json.loads(stored))
        pairs: list[tuple[str, str | None]] = [
            ("Mission", fields.mission_summary),
            ("Environments", ", ".join(fields.environments) or None),
            ("Compliance frameworks", ", ".join(fields.compliance_frameworks) or None),
            (
                "Period of performance",
                f"{fields.period_of_performance_months} months" if fields.period_of_performance_months else None,
            ),
            ("Work model", _WORK_MODEL_LABELS.get(fields.work_model) if fields.work_model else None),
        ]
        return [PublicScopeField(label=label, value=value) for label, value in pairs if value]
