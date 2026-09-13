"""Request and response schemas for task endpoints: REBID scope, publishing, acceptance and relationships."""

from pydantic import BaseModel

from app.api.listings.schemas import PublishChoicesInput
from app.services.listings.types import PublicListingProjection
from app.services.tasks.acceptance import AcceptanceCheck
from app.services.tasks.scope.types import TaskScopeDraft


class RebidRequest(BaseModel):
    """A REBID of one of the acting account's expenses, with its requirement rows and disclosure choices."""

    expense_id: str
    draft: TaskScopeDraft
    choices: PublishChoicesInput


class TaskPreviewResponse(BaseModel):
    """The exact public payload publishing would serve, and the hash that confirms it."""

    payload_hash: str
    projection: PublicListingProjection


class PublishTaskRequest(BaseModel):
    """The preview hash the poster saw."""

    previewed_payload_hash: str


class AcceptOfferRequest(BaseModel):
    """Acceptance, with the explicit confirmation an offer above the listed price needs."""

    is_above_price_confirmed: bool = False


class AcceptanceCheckResponse(AcceptanceCheck):
    """What accepting would do, before anything changes."""


class ListingRelationshipResponse(BaseModel):
    """How the acting account relates to a listing, so the bid ticket never offers a bid the server must refuse.

    Only the poster learns the task id; everyone else learns only that it isn't theirs.
    """

    is_poster: bool
    task_id: str | None
