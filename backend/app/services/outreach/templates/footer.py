"""Builds the compliance footer every invitation carries: the sender's postal address line and a working opt-out link.
A property of the template (roadmap 08, step 6): no caller can render an invitation without it.
"""

POSTAL_ADDRESS_MISSING = "Postal address: not configured — real sending is blocked until OUTREACH_POSTAL_ADDRESS is set"


def build_compliance_footer(sender_name: str, postal_address: str, opt_out_link: str) -> str:
    """Return the footer lines; a missing postal address is stated in the footer rather than silently omitted.

    The address is the platform's, since the platform sends on the business's behalf. Using the
    business's address would publish a private street address.
    """

    address = postal_address.strip() or POSTAL_ADDRESS_MISSING
    return "\n".join(
        [
            "--",
            f"{sender_name} · {address}",
            f"Don't want invitations? Opt out: {opt_out_link}",
        ]
    )
