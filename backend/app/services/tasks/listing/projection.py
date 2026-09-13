"""Builds the public projection of a new task or a piece, field by field, from that task's own records only.
It takes no parent task and reads none: the parent, its poster, its accepted price, rates, remainder and savings are
not inputs, so they can't reach the payload (CLAUDE.md, "Nothing upstream appears in a piece's public projection").
"""

from app.models.listing import PublicListingRecord, ScopeVersion
from app.models.tasks import Task
from app.services.listings.current_price import resolve_stated_price
from app.services.listings.types import PublicListingProjection
from app.services.scope.public_content import PublicScopeContent
from app.services.scope.summary import summarize_requirements
from app.services.tasks.scope.types import TaskPublishChoices


def build_task_listing_projection(
    listing: PublicListingRecord,
    task: Task,
    scope: ScopeVersion,
    content: PublicScopeContent,
    choices: TaskPublishChoices,
    is_subcontract: bool,
) -> PublicListingProjection:
    """Return the exact public payload for a new task or piece.

    Only these fields of the task are read: its category and currency. The price is the scope's own stated price
    (a budget or a cut), and it is None unless the poster chose to show it.
    """

    stated = resolve_stated_price(scope)
    area = scope.service_area or ""
    return PublicListingProjection(
        id=listing.id,
        expense_id=None,
        category=task.category,
        scope_summary=summarize_requirements(area, content.requirements, content.constraints),
        # Requirement rows replace the cleaning task list; completeness is scored from per-requirement responses.
        required_tasks=[],
        visit_frequency=None,
        supplies_included=None,
        equipment_included=None,
        taxes_included=None,
        price_minor=stated.amount.amount if stated is not None and choices.show_price else None,
        price_currency=task.currency,
        billing_cadence=scope.billing_cadence or task.billing_period,
        service_area_approximate=area,
        bidding_mode=choices.bidding_mode,
        challenge_deadline=scope.challenge_deadline,
        incumbent_vendor_name=None,
        show_exact_address=False,
        visibility=listing.visibility,
        published_at=listing.published_at,
        title=content.title,
        requirements=list(content.requirements),
        constraints=list(content.constraints),
        scope_fields=list(content.scope_fields),
        is_subcontract=is_subcontract,
        price_disclosed=choices.show_price,
    )
