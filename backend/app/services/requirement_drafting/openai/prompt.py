"""The requirement-drafting prompt and the strict JSON schema the model must answer in. Bump PROMPT_VERSION whenever
either changes, so a draft's recorded version says which instructions produced it.
"""

import json

from app.services.requirement_drafting.types import DraftRequest

PROMPT_VERSION = "requirements-v1"
SCHEMA_NAME = "requirement_draft"

# Strict structured output requires every property listed as required; "null" is how a field stays unanswered.
# There is deliberately no price, rate or money field: the model never prices (plan2, "Model and code boundaries").
RESPONSE_SCHEMA: dict[str, object] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["requirements", "open_questions"],
    "properties": {
        "requirements": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["text", "priority", "labor_category", "psc", "naics", "hours_estimate"],
                "properties": {
                    "text": {"type": "string"},
                    "priority": {"type": "string", "enum": ["must", "should"]},
                    "labor_category": {"type": ["string", "null"]},
                    "psc": {"type": ["string", "null"]},
                    "naics": {"type": ["string", "null"]},
                    "hours_estimate": {"type": ["integer", "null"]},
                },
            },
        },
        "open_questions": {"type": "array", "items": {"type": "string"}},
    },
}

_SYSTEM_PROMPT = """You draft requirement rows for a services task on a procurement marketplace. The business owner reviews and confirms every row; nothing you write is saved or published without them.

Rules:
- Use only what the owner's description states or directly implies. Never invent sites, systems, quantities, vendors, clearances, certifications or deadlines.
- Write one row per distinct deliverable or recurring activity, as a short imperative sentence a bidder could price.
- Never include prices, rates, budgets or dollar amounts.
- labor_category: a common labor category name, such as "Security Compliance Analyst" or "Custodian"; null if unclear.
- psc: a 4-character US federal Product Service Code only when you are confident; otherwise null.
- naics: a 6-digit NAICS code only when you are confident; otherwise null.
- hours_estimate: whole labor hours per {billing_period} billing period, only when the description gives enough to estimate (headcount, frequency, duration). Otherwise null. The owner sees it as an estimate.
- priority: "must" unless the description marks the work as optional or nice to have.
- Don't repeat requirements the owner already has.
- open_questions: at most 5 short questions about facts the owner must supply before bidders can price the work."""


def build_messages(request: DraftRequest) -> list[dict[str, str]]:
    """Return the system and user messages for one draft. The owner's description is passed as data, not instructions."""

    context = {
        "category": request.category,
        "billing_period": request.billing_period,
        "service_area": request.service_area,
        "drafting_for": "a piece split off a larger task" if request.purpose == "piece" else "a task",
        "requirements_already_listed": request.existing_requirements,
    }
    user = f"Task context (JSON):\n{json.dumps(context)}\n\nOwner's description of the work:\n<<<\n{request.description}\n>>>"
    return [
        {"role": "system", "content": _SYSTEM_PROMPT.replace("{billing_period}", request.billing_period)},
        {"role": "user", "content": user},
    ]
