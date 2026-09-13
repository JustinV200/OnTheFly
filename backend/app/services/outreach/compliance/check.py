"""Checks whether the configured channel may send commercial email, before an owner can approve a batch.
The template guarantees the opt-out and public-only content; these checks cover what configuration must supply.
"""

from pydantic import BaseModel

from app.core.config import Settings
from app.core.email_address import is_valid_email


class ComplianceCheck(BaseModel):
    """One named requirement, whether it passed, and whether failing it stops sending."""

    key: str
    label: str
    passed: bool
    blocks_sending: bool
    detail: str


class ComplianceReport(BaseModel):
    """Every check for the channel; ready means no failed check blocks sending."""

    ready: bool
    checks: list[ComplianceCheck]


def check_compliance(channel: str, settings: Settings, listing_is_public: bool) -> ComplianceReport:
    """Return the checks for a channel name ("sandbox" or "smtp") against current settings.

    The sandbox reaches no inbox, so a missing postal address is reported but doesn't block it;
    for smtp the same gap blocks approval.
    """

    is_real_email = channel == "smtp"
    checks = [
        _sender_identity(settings, is_real_email),
        _postal_address(settings, is_real_email),
        ComplianceCheck(
            key="opt_out_link",
            label="Working opt-out",
            passed=True,
            blocks_sending=False,
            detail="Every invitation carries its own opt-out link and a List-Unsubscribe header; "
            "an opted-out address is never invited again.",
        ),
        ComplianceCheck(
            key="public_listing_link",
            label="Links to the public listing",
            passed=listing_is_public,
            blocks_sending=not listing_is_public,
            detail="The invitation links to the live public listing page, with no private flow or token."
            if listing_is_public
            else "The listing is not public, so there is no public page to link to.",
        ),
        ComplianceCheck(
            key="public_content_only",
            label="Only public information",
            passed=True,
            blocks_sending=False,
            detail="The message is built from the published listing and your public profile name only.",
        ),
    ]
    if is_real_email:
        checks.append(_smtp_server(settings))
    ready = not any(check.blocks_sending and not check.passed for check in checks)
    return ComplianceReport(ready=ready, checks=checks)


def _sender_identity(settings: Settings, is_real_email: bool) -> ComplianceCheck:
    from_email = settings.outreach_from_email.strip()
    sender = f"{settings.outreach_from_name.strip()} <{from_email}>"
    if not settings.outreach_from_name.strip() or not is_valid_email(from_email):
        return _failed("sender_identity", "Accurate sender identity", "OUTREACH_FROM_NAME and a valid OUTREACH_FROM_EMAIL must be set.")
    if is_real_email and from_email.lower().endswith(".example"):
        return _failed(
            "sender_identity",
            "Accurate sender identity",
            f"{sender} uses the reserved .example domain, which cannot send real email. Set OUTREACH_FROM_EMAIL.",
        )
    return ComplianceCheck(
        key="sender_identity",
        label="Accurate sender identity",
        passed=True,
        blocks_sending=False,
        detail=f"Invitations are sent as {sender}, on behalf of your business.",
    )


def _postal_address(settings: Settings, is_real_email: bool) -> ComplianceCheck:
    address = settings.outreach_postal_address.strip()
    if address:
        return ComplianceCheck(
            key="postal_address",
            label="Physical postal address",
            passed=True,
            blocks_sending=False,
            detail=f"The footer shows the platform's postal address: {address}.",
        )
    return ComplianceCheck(
        key="postal_address",
        label="Physical postal address",
        passed=False,
        blocks_sending=is_real_email,
        detail="OUTREACH_POSTAL_ADDRESS is not set, so real email is blocked."
        if is_real_email
        else "OUTREACH_POSTAL_ADDRESS is not set. Allowed for the sandbox outbox only; real sending stays blocked until it is set.",
    )


def _smtp_server(settings: Settings) -> ComplianceCheck:
    if not settings.smtp_host.strip():
        return _failed("smtp_server", "Mail server configured", "SMTP_HOST is not set.")
    return ComplianceCheck(
        key="smtp_server",
        label="Mail server configured",
        passed=True,
        blocks_sending=False,
        detail=f"Sending through {settings.smtp_host.strip()}:{settings.smtp_port}; only allowlisted recipients can receive it.",
    )


def _failed(key: str, label: str, detail: str) -> ComplianceCheck:
    return ComplianceCheck(key=key, label=label, passed=False, blocks_sending=True, detail=detail)
