"""Seeds the fixed demo accounts used across the app and tests.
The seed is idempotent so reruns never duplicate account records.
"""

from sqlalchemy.orm import Session

from app.models.account import Account


SEEDED_ACCOUNTS = [
    {
        "id": "acc_owner_1",
        "handle": "apex-facilities",
        "business_name": "Apex Facilities Group",
        "service_area": "San Francisco Bay Area",
    },
    {
        "id": "acc_challenger_1",
        "handle": "bay-clean-pro",
        "business_name": "Bay Clean Professional Services",
        "service_area": "San Francisco Bay Area",
    },
    {
        "id": "acc_challenger_2",
        "handle": "golden-gate-janitorial",
        "business_name": "Golden Gate Janitorial",
        "service_area": "San Francisco Bay Area",
    },
    {
        "id": "acc_challenger_3",
        "handle": "summit-building-services",
        "business_name": "Summit Building Services",
        "service_area": "San Francisco Bay Area",
    },
    # A second publishing business, so the demo owner's listing has a comparable neighbour
    # for fly-brain similar listings. Fictional, like every other seeded account.
    {
        "id": "acc_owner_2",
        "handle": "tidewater-architecture",
        "business_name": "Tidewater Architecture Studio",
        "service_area": "San Francisco Bay Area",
    },
]


def run_seed(db: Session) -> int:
    """Insert or update the seeded demo accounts and return the count."""

    for payload in SEEDED_ACCOUNTS:
        account = db.get(Account, payload["id"])
        if account is None:
            db.add(Account(**payload))
            continue
        account.handle = payload["handle"]
        account.business_name = payload["business_name"]
        account.service_area = payload["service_area"]

    db.commit()
    return len(SEEDED_ACCOUNTS)
