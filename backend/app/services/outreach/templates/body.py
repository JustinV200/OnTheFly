"""Builds the invitation's plain-text body from the public listing projection and the business's public name.
It reads only PublicListingProjection fields, and deliberately never the incumbent vendor, even when the listing shows it.
"""

from app.services.listings.category_label import category_label
from app.services.listings.types import PublicListingProjection
from app.services.outreach.templates.terms import describe_bidding_mode, describe_deadline, describe_price


def build_invitation_body(
    projection: PublicListingProjection,
    business_name: str,
    sender_name: str,
    recipient_name: str,
    listing_url: str,
    profile_url: str,
    footer: str,
) -> str:
    """Return the full body text, ending with the compliance footer.

    The incumbent's name is left out even when the owner published it: naming a third party's
    pricing in cold email goes further than a listing a provider chose to open.
    """

    label = category_label(projection.category).casefold()
    area = projection.service_area_approximate.strip() or "the area shown on the listing"
    tasks = ", ".join(projection.required_tasks) if projection.required_tasks else "None listed"
    lines = [
        f"Hello {recipient_name},",
        "",
        f"{business_name} is inviting offers for {label} in {area}.",
        "",
        "The job, as described on the public listing:",
        f"- Scope: {projection.scope_summary}",
        f"- Visit frequency: {projection.visit_frequency or 'Not stated'}",
        f"- Required tasks: {tasks}",
        f"- Current price: {describe_price(projection.price_minor, projection.price_currency, projection.billing_cadence)}",
        "",
        describe_bidding_mode(projection.bidding_mode),
        describe_deadline(projection.challenge_deadline),
        "",
        f"See the full listing and submit an offer: {listing_url}",
        f"About {business_name}: {profile_url}",
        "",
        f"This is a one-time invitation sent by {sender_name} on behalf of {business_name}. "
        "No reply is needed, and it's fine to ignore it if the job isn't a fit.",
        "",
        footer,
    ]
    return "\n".join(lines)
