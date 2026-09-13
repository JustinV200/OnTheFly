"""Locks in the shared payroll, tax, and transfer classifier behind import exclusion and group eligibility.
Descriptors are bank-shaped (as Stripe delivers them) and dashboard-shaped (as sync names vendor groups).
"""

import pytest

from app.services.expenses.eligibility import classify_eligibility
from app.services.expenses.exclusions import classify_spend_exclusion


@pytest.mark.parametrize(
    ("descriptor", "reason"),
    [
        ("ONLINE TRANSFER TO SAVINGS XXXX1234", "transfer"),
        ("WIRE TRANSFER OUT", "transfer"),
        ("TRANSFER FROM CHK 5678", "transfer"),
        ("ONLINE-TRANSFER 0042", "transfer"),
        ("ACH XFER 0042", "transfer"),
        ("IRS USATAXPYMT 270612345678901", "tax"),
        ("IRS*USATAXPYMT", "tax"),
        ("STATE SALES TAXES", "tax"),
        ("EFTPS 941 DEPOSIT", "tax"),
        ("FRANCHISE TAX BOARD", "tax"),
        ("NJ DEPT OF REVENUE", "tax"),
        ("ACH PAYROLL GUSTO", "payroll"),
        ("ADP WAGE PAY", "payroll"),
    ],
)
def test_bank_descriptors_are_excluded_in_any_direction(descriptor: str, reason: str) -> None:
    assert classify_spend_exclusion(descriptor) == reason


@pytest.mark.parametrize(
    "descriptor",
    [
        "TRANSFER PRO CLEANING",
        "Syntaxco",
        "Exacta Supplies",
        "Taxi Fleet Detailing",
        "First Choice Janitorial",
        "SQ *SPARKLE CLEAN 4158881234 SF",
    ],
)
def test_vendor_names_that_only_resemble_exclusions_stay_eligible(descriptor: str) -> None:
    assert classify_spend_exclusion(descriptor) is None


def test_missing_fields_are_skipped_rather_than_matched() -> None:
    assert classify_spend_exclusion(None, "", "Monthly office cleaning") is None


@pytest.mark.parametrize(
    ("vendor", "reason"),
    [
        ("Online Transfer To Savings Xxxx1234 [USD]", "transfer"),
        ("Wire Transfer Out [USD]", "transfer"),
        ("Irs Usataxpymt [USD]", "tax"),
        ("State Sales Taxes [USD]", "tax"),
    ],
)
def test_synced_group_names_are_never_publishable(vendor: str, reason: str) -> None:
    result = classify_eligibility(vendor, None)

    assert (result.eligible, result.publishable, result.reason) == (False, False, reason)


def test_category_with_underscores_still_matches() -> None:
    result = classify_eligibility("Acme Services", "sales_tax")

    assert (result.publishable, result.reason) == (False, "tax")


@pytest.mark.parametrize("vendor", ["Transfer Pro Cleaning", "Syntaxco"])
def test_cleaning_vendors_stay_publishable(vendor: str) -> None:
    result = classify_eligibility(vendor, "cleaning")

    assert (result.eligible, result.publishable, result.reason) == (True, True, "eligible")
