"""Request and response schemas for outbound invitation endpoints.
Owner inputs are validated and normalized here; response bodies reuse the service view models.
"""

import re
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, field_validator

from app.core.email_address import is_valid_email, normalize_email
from app.services.outreach import InvitationView, SandboxOutboxMessageView
from app.workers.outreach import QueueRunSummary

_CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")
MAX_BATCH_SIZE = 50


class AddCandidateRequest(BaseModel):
    """A provider the owner found by hand. Only business_name is required."""

    business_name: str = Field(min_length=1, max_length=255)
    contact_email: str | None = Field(default=None, max_length=254)
    website_url: str | None = Field(default=None, max_length=1024)
    phone: str | None = Field(default=None, max_length=64)
    service_area: str | None = Field(default=None, max_length=255)
    capability_summary: str | None = Field(default=None, max_length=2000)
    # True when the owner already contacted this provider by hand; it then can't be invited automatically.
    contacted_off_platform: bool = False

    @field_validator("business_name")
    @classmethod
    def _name_is_one_line(cls, value: str) -> str:
        # The name lands in the To header; a line break there could forge a header.
        stripped = value.strip()
        if not stripped or _CONTROL_CHARACTERS.search(stripped):
            raise ValueError("business_name must be a non-blank single line")
        return stripped

    @field_validator("contact_email", "phone", "service_area", "capability_summary", "website_url", mode="before")
    @classmethod
    def _blank_is_unanswered(cls, value: object) -> object:
        # A blank field means the owner didn't provide it, which is stored as None, never as "".
        if isinstance(value, str) and not value.strip():
            return None
        return value.strip() if isinstance(value, str) else value

    @field_validator("contact_email")
    @classmethod
    def _email_is_valid(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not is_valid_email(value):
            raise ValueError("contact_email must be a valid email address")
        return normalize_email(value)

    @field_validator("website_url")
    @classmethod
    def _website_has_host(cls, value: str | None) -> str | None:
        if value is None:
            return None
        candidate = value if "://" in value else f"https://{value}"
        try:
            parts = urlsplit(candidate)
        except ValueError as error:
            raise ValueError("website_url must be a web address") from error
        if parts.scheme not in {"http", "https"} or not parts.hostname:
            raise ValueError("website_url must be an http or https address")
        return candidate


class CandidateSelectionRequest(BaseModel):
    """The candidates the owner selected for one invitation batch."""

    candidate_ids: list[str] = Field(min_length=1, max_length=MAX_BATCH_SIZE)


class ApproveInvitationsRequest(CandidateSelectionRequest):
    """The selection plus the hash of the exact preview the owner saw."""

    previewed_message_hash: str = Field(min_length=64, max_length=64)


class ApproveInvitationsResponse(BaseModel):
    """The approval, its invitations after the immediate send attempt, and what that attempt did."""

    approval_id: str
    # True when this request repeated an approval already recorded (e.g. a double-click); nothing new was created.
    replayed: bool
    invitations: list[InvitationView]
    queue: QueueRunSummary


class SandboxOutboxResponse(BaseModel):
    """What the sandbox channel captured for one listing, newest first."""

    messages: list[SandboxOutboxMessageView]
