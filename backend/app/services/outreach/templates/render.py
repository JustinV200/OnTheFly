"""Renders one invitation (subject, body, headers) for one provider candidate.
Headers are accurate by construction: From is the platform, To is the candidate's published address, and List-Unsubscribe is always set.
"""

from email.utils import formataddr
import re

from pydantic import BaseModel

from app.core.config import Settings
from app.models.outreach.provider_candidate import ProviderCandidate
from app.services.listings.category_label import category_label
from app.services.listings.types import PublicListingProjection
from app.services.outreach.templates.body import build_invitation_body
from app.services.outreach.templates.footer import build_compliance_footer
from app.services.outreach.templates.links import opt_out_url, public_listing_url, public_profile_url

# Bump when the wording or headers change, so an approval records which template it approved.
TEMPLATE_VERSION = "invitation-v1"

# Control characters (CR/LF above all) in a name would let text become a second header line.
_CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]+")


class RenderedInvitation(BaseModel):
    """One fully rendered invitation, exactly as the owner previews and approves it."""

    subject: str
    body_text: str
    headers: dict[str, str]


def render_invitation(
    projection: PublicListingProjection,
    business_name: str,
    business_handle: str,
    candidate: ProviderCandidate,
    settings: Settings,
) -> RenderedInvitation:
    """Render the invitation from public data only; raises ValueError for a candidate with no contact email.

    Inputs are the stored public projection, the owner's public profile name and handle, the
    candidate's name and published address, and platform settings. Nothing private is in reach.
    """

    if not candidate.contact_email:
        raise ValueError("A candidate without a published contact email cannot be rendered an invitation")

    safe_business = _single_line(business_name)
    safe_recipient = _single_line(candidate.business_name)
    safe_sender = _single_line(settings.outreach_from_name)
    listing_link = public_listing_url(settings.public_app_base_url, projection.id)
    unsubscribe_link = opt_out_url(settings.public_app_base_url, candidate.opt_out_token)

    label = category_label(projection.category)
    area = _single_line(projection.service_area_approximate)
    subject = f"{safe_business} is inviting offers: {label} in {area}" if area else f"{safe_business} is inviting offers: {label}"
    body = build_invitation_body(
        projection=projection,
        business_name=safe_business,
        sender_name=safe_sender,
        recipient_name=safe_recipient,
        listing_url=listing_link,
        profile_url=public_profile_url(settings.public_app_base_url, business_handle),
        footer=build_compliance_footer(safe_sender, settings.outreach_postal_address, unsubscribe_link),
    )
    headers = {
        "From": formataddr((safe_sender, settings.outreach_from_email.strip())),
        "To": formataddr((safe_recipient, candidate.contact_email)),
        "Subject": subject,
        "List-Unsubscribe": f"<{unsubscribe_link}>",
    }
    return RenderedInvitation(subject=subject, body_text=body, headers=headers)


def _single_line(value: str) -> str:
    return " ".join(_CONTROL_CHARACTERS.sub(" ", value).split())
