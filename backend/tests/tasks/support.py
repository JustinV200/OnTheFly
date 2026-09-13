"""Shared setup for task ownership and splitting tests: staging the GovCon chain and small API helpers.
Every helper goes through the real services or endpoints, so tests exercise the same guards the demo does.
"""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.challenge import Challenge
from app.models.listing import PublicListingRecord
from app.models.tasks import Task
from app.services.demo.task_chain import StagedChain, stage_task_chain
from app.services.scope.requirements import load_requirements

GOVCON = "acc_govcon_1"
PRIME_A = "acc_prime_a"
SUB_B = "acc_sub_b"
# A seeded account outside the chain, for bids from an unrelated business.
BAY_CLEAN = "acc_challenger_1"


def headers(account_id: str) -> dict[str, str]:
    """Return the demo identity header for an account."""

    return {"X-Account-ID": account_id}


def stage(db: Session, target: str) -> StagedChain:
    """Stage the chain at a named point through the real services."""

    return stage_task_chain(target, db)  # type: ignore[arg-type]  # tests pass stage names as literals


def listing_of(db: Session, task_id: str) -> PublicListingRecord:
    """Return a task's listing record, fresh from the database."""

    db.expire_all()
    listing = db.scalar(select(PublicListingRecord).where(PublicListingRecord.task_id == task_id))
    assert listing is not None
    return listing


def task_of(db: Session, task_id: str) -> Task:
    """Return a task, fresh from the database."""

    db.expire_all()
    task = db.get(Task, task_id)
    assert task is not None
    return task


def requirement_keys(db: Session, task_id: str) -> list[str]:
    """Return the keys on the task listing's current scope version."""

    return [row.requirement_key for row in load_requirements(listing_of(db, task_id).scope_version_id, db)]


def offer(
    client: TestClient,
    db: Session,
    task_id: str,
    bidder_id: str,
    price_minor: int,
    excluded_keys: tuple[str, ...] = (),
    billing_frequency: str = "annual",
) -> dict:
    """Submit (or revise) an offer through the API answering every requirement on the listing's current scope."""

    listing = listing_of(db, task_id)
    response = client.post(
        f"/api/listings/{listing.id}/challenges",
        headers=headers(bidder_id),
        json={
            "acknowledged_bidding_mode": listing.bidding_mode,
            "price_minor": price_minor,
            "billing_frequency": billing_frequency,
            "requirement_responses": [
                {"requirement_key": key, "is_included": key not in excluded_keys} for key in requirement_keys(db, task_id)
            ],
        },
    )
    return {"status": response.status_code, "body": response.json()}


def active_offer_id(db: Session, task_id: str, bidder_id: str) -> str:
    """Return the bidder's active offer on the task's listing."""

    listing = listing_of(db, task_id)
    challenge_id = db.scalar(
        select(Challenge.id).where(
            Challenge.listing_id == listing.id, Challenge.challenger_account_id == bidder_id, Challenge.is_active.is_(True)
        )
    )
    assert challenge_id is not None
    return challenge_id


def publish_task(client: TestClient, task_id: str, poster_id: str, show_price: bool = False, bidding_mode: str = "sealed") -> dict:
    """Confirm, preview and publish a new task or piece through the API; return the published projection."""

    confirmed = client.post(
        f"/api/tasks/{task_id}/confirm", headers=headers(poster_id), json={"bidding_mode": bidding_mode, "show_price": show_price}
    )
    assert confirmed.status_code == 200, confirmed.text
    return republish(client, task_id, poster_id)


def republish(client: TestClient, task_id: str, poster_id: str) -> dict:
    """Preview and publish a scope-confirmed task listing with the exact preview hash."""

    preview = client.get(f"/api/tasks/{task_id}/preview", headers=headers(poster_id))
    assert preview.status_code == 200, preview.text
    published = client.post(
        f"/api/tasks/{task_id}/publish",
        headers=headers(poster_id),
        json={"previewed_payload_hash": preview.json()["payload_hash"]},
    )
    assert published.status_code == 200, published.text
    return published.json()["projection"]


def split(
    client: TestClient,
    task_id: str,
    owner_id: str,
    keys: list[str],
    cut_minor: int,
    title: str = "Piece",
    currency: str = "USD",
    billing_period: str = "annual",
    **extra: object,
) -> dict:
    """Split a piece off through the API and return the status and body."""

    response = client.post(
        f"/api/tasks/{task_id}/splits",
        headers=headers(owner_id),
        json={
            "title": title,
            "requirement_keys": keys,
            "cut_minor": cut_minor,
            "currency": currency,
            "billing_period": billing_period,
            **extra,
        },
    )
    return {"status": response.status_code, "body": response.json()}


def accept(client: TestClient, task_id: str, poster_id: str, challenge_id: str, confirm_above: bool = False) -> dict:
    """Accept an offer through the API and return the status and body."""

    response = client.post(
        f"/api/tasks/{task_id}/offers/{challenge_id}/accept",
        headers=headers(poster_id),
        json={"is_above_price_confirmed": confirm_above},
    )
    return {"status": response.status_code, "body": response.json()}
