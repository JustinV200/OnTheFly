"""Checks the private-by-default visibility helpers."""

from app.core.visibility import ListingVisibility, PRIVATE_DEFAULT, is_public


def test_private_default_is_private() -> None:
    assert PRIVATE_DEFAULT == ListingVisibility.private


def test_is_public_only_for_explicit_public_state() -> None:
    assert is_public(ListingVisibility.public) is True
    assert is_public(ListingVisibility.private) is False
    assert is_public(None) is False
