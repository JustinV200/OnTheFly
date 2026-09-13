"""FastAPI dependencies that build the configured discovery source and delivery channel per request.
Kept as dependencies so tests can override them without touching settings.
"""

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.services.discovery import DiscoverySource, get_discovery_source
from app.services.outreach import OutreachSender, get_outreach_sender


def settings_dependency() -> Settings:
    """Return the process settings."""

    return get_settings()


def sender_dependency(settings: Settings = Depends(settings_dependency)) -> OutreachSender:
    """Return the configured invitation channel (sandbox by default)."""

    return get_outreach_sender(settings)


def discovery_source_dependency(settings: Settings = Depends(settings_dependency)) -> DiscoverySource:
    """Return the configured discovery source (fixture by default)."""

    return get_discovery_source(settings)
