"""Real email over SMTP, restricted to an explicit recipient allowlist.
Any failure after the server may have received the message is permanent: retrying could deliver the same invitation twice.
"""

from collections.abc import Callable
from email.message import EmailMessage
from email.utils import formatdate, parseaddr
import hashlib
import smtplib
import ssl
from typing import Protocol

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.email_address import normalize_email
from app.services.outreach.senders.allowlist import parse_recipient_allowlist
from app.services.outreach.senders.base import OutgoingMessage, OutreachSender, SendResult

SMTP_TIMEOUT_SECONDS = 20.0
NOT_ALLOWLISTED = "recipient not on the sending allowlist"


class SmtpConnection(Protocol):
    """The subset of smtplib.SMTP this sender uses, so tests can pass a fake."""

    def __enter__(self) -> "SmtpConnection": ...
    def __exit__(self, *exc_info: object) -> object: ...
    def starttls(self, *, context: ssl.SSLContext) -> object: ...
    def login(self, user: str, password: str) -> object: ...
    def send_message(self, msg: EmailMessage, to_addrs: list[str]) -> dict[str, tuple[int, bytes]]: ...


SmtpFactory = Callable[[str, int, float], SmtpConnection]


class SmtpSender(OutreachSender):
    """Sends approved invitations through the configured SMTP server."""

    name = "smtp"
    label = "SMTP — real email, allowlisted recipients only"
    delivers_real_email = True
    tracks_delivery = False

    def __init__(self, settings: Settings, smtp_factory: SmtpFactory | None = None) -> None:
        """Read SMTP settings once; smtp_factory defaults to smtplib.SMTP and is replaced in tests."""

        self._host = settings.smtp_host
        self._port = settings.smtp_port
        self._username = settings.smtp_username
        self._password = settings.smtp_password
        self._use_starttls = settings.smtp_use_starttls
        self._allowlist = parse_recipient_allowlist(settings.outreach_recipient_allowlist)
        self._factory: SmtpFactory = smtp_factory or _connect

    def refusal_reason(self, email: str) -> str | None:
        """Refuse every address not listed exactly in OUTREACH_RECIPIENT_ALLOWLIST."""

        return None if normalize_email(email) in self._allowlist else "Not on the sending allowlist"

    def send(self, message: OutgoingMessage, idempotency_key: str, db: Session) -> SendResult:
        """Send one message; the allowlist is enforced before any connection is opened."""

        if self.refusal_reason(message.to_email) is not None:
            return SendResult(outcome="permanent_failure", detail=NOT_ALLOWLISTED)
        if not self._host:
            return SendResult(outcome="permanent_failure", detail="SMTP_HOST is not configured")

        email_message = _build_email(message, idempotency_key)
        handed_over = False
        try:
            with self._factory(self._host, self._port, SMTP_TIMEOUT_SECONDS) as connection:
                if self._use_starttls:
                    connection.starttls(context=ssl.create_default_context())
                if self._username:
                    connection.login(self._username, self._password)
                handed_over = True
                refused = connection.send_message(email_message, to_addrs=[message.to_email])
        except smtplib.SMTPRecipientsRefused:
            return SendResult(outcome="permanent_failure", detail="The mail server refused the recipient address")
        except smtplib.SMTPAuthenticationError:
            return SendResult(outcome="permanent_failure", detail="SMTP login failed; check SMTP_USERNAME and SMTP_PASSWORD")
        except smtplib.SMTPResponseException as error:
            # A 4xx reply is a definite "not now" before acceptance; 5xx is a definite rejection.
            outcome = "transient_failure" if 400 <= error.smtp_code < 500 else "permanent_failure"
            return SendResult(outcome=outcome, detail=f"The mail server replied {error.smtp_code}")
        except (smtplib.SMTPException, OSError) as error:
            if handed_over:
                return SendResult(
                    outcome="permanent_failure",
                    detail=f"Connection lost while sending ({error.__class__.__name__}); delivery is unknown, so it is not retried",
                )
            return SendResult(
                outcome="transient_failure",
                detail=f"Could not reach the mail server ({error.__class__.__name__})",
            )

        if refused:
            return SendResult(outcome="permanent_failure", detail="The mail server refused the recipient address")
        return SendResult(outcome="accepted", provider_message_id=email_message["Message-ID"])


def _connect(host: str, port: int, timeout: float) -> SmtpConnection:
    # Keyword arguments: smtplib.SMTP's third positional parameter is local_hostname, not timeout.
    return smtplib.SMTP(host=host, port=port, timeout=timeout)


def _build_email(message: OutgoingMessage, idempotency_key: str) -> EmailMessage:
    email_message = EmailMessage()
    # Headers come from the approved invitation verbatim; the template put From, To, Subject, and
    # List-Unsubscribe there, so nothing the owner approved is dropped or rewritten here.
    for header_name, value in message.headers.items():
        email_message[header_name] = value
    from_address = normalize_email(parseaddr(message.headers.get("From", ""))[1])
    from_domain = from_address.rsplit("@", 1)[-1] if "@" in from_address else "localhost"
    # Stable per idempotency key, so a receiving server can recognise the same invitation.
    digest = hashlib.sha256(idempotency_key.encode("utf-8")).hexdigest()[:32]
    email_message["Message-ID"] = f"<invitation-{digest}@{from_domain}>"
    email_message["Date"] = formatdate(localtime=False)
    email_message.set_content(message.body_text)
    return email_message
