"""The invitation template: public-data-only content with compliance (headers, postal address, opt-out) built in."""

from app.services.outreach.templates.footer import POSTAL_ADDRESS_MISSING
from app.services.outreach.templates.links import opt_out_url, public_listing_url, public_profile_url
from app.services.outreach.templates.render import TEMPLATE_VERSION, RenderedInvitation, render_invitation

__all__ = [
    "POSTAL_ADDRESS_MISSING",
    "RenderedInvitation",
    "TEMPLATE_VERSION",
    "opt_out_url",
    "public_listing_url",
    "public_profile_url",
    "render_invitation",
]
