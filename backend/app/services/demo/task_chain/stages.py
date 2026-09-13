"""Stages the GovCon task-chain demo at a named point, replaying every earlier step through the real services.
Each step passes the same guards a live user would hit (preview hashes, payer chain, acceptance blocks), and every
offer comes from a seeded demo account, so it is labeled demo data (plan2, "Demo").
"""

from typing import Literal

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.task_lifecycle import SplitEntryPoint
from app.models.challenge import Challenge
from app.models.service_expense import ServiceExpense
from app.models.tasks import Task
from app.services.challenges.submit import submit_challenge
from app.services.demo.task_chain.accounts import DEVSECOPS_VENDOR, GOVCON_ID, GOVCON_PROVIDER_ACCOUNT_ID, PRIME_A_ID, SUB_B_ID
from app.services.demo.task_chain.drafts import devsecops_rebid_draft, zero_trust_new_task_draft
from app.services.demo.task_chain.fixture_rates import reseed_fixture_rates
from app.services.demo.task_chain.reset import clear_task_chain
from app.services.listings.types import PublishChoices
from app.services.savings import current_cards
from app.services.savings.inputs import CardInputs
from app.services.scope.requirements import load_requirements
from app.services.splitting.create import SplitRequest, split_off_piece
from app.services.tasks.acceptance import accept_offer
from app.services.tasks.access import listing_for_task
from app.services.tasks.listing.any_origin import preview_any, publish_any
from app.services.tasks.listing.publish import confirm_task_scope
from app.services.tasks.scope.create_new import create_new_task
from app.services.tasks.scope.rebid_scope import confirm_rebid_scope
from app.services.tasks.scope.types import TaskPublishChoices
from app.services.transactions.fixture.source import FixtureSource
from app.services.transactions.import_run import run_import

Stage = Literal["start", "rebid_published", "prime_offer", "prime_owns", "piece_published", "sub_offer", "sub_owns"]

STAGE_ORDER: tuple[Stage, ...] = (
    "start",
    "rebid_published",
    "prime_offer",
    "prime_owns",
    "piece_published",
    "sub_offer",
    "sub_owns",
)

# Demo offer prices, per year. Prime A bids under GovCon's observed spend; Sub B bids under Prime A's suggested cut.
PRIME_A_OFFER_MINOR = 129_800_000
SUB_B_OFFER_MINOR = 21_900_000


class StagedChain(BaseModel):
    """What the staging produced, so the demo guide can link straight to each task."""

    stage: Stage
    rebid_task_id: str | None
    new_task_id: str | None
    piece_task_id: str | None


def stage_task_chain(target: Stage, db: Session) -> StagedChain:
    """Reset the chain and replay steps up to and including target."""

    steps = STAGE_ORDER[: STAGE_ORDER.index(target) + 1]
    clear_task_chain(db)
    # GovCon's synthetic ledger through the normal fixture pipeline; stable ids make a re-import a no-op.
    run_import(GOVCON_ID, GOVCON_PROVIDER_ACCOUNT_ID, db, source=FixtureSource())
    reseed_fixture_rates(db)
    new_task = create_new_task(GOVCON_ID, zero_trust_new_task_draft(), db)
    _publish(new_task, GOVCON_ID, db, TaskPublishChoices(bidding_mode="sealed", show_price=False))
    result = StagedChain(stage=target, rebid_task_id=None, new_task_id=new_task.id, piece_task_id=None)

    if "rebid_published" in steps:
        result.rebid_task_id = _publish_rebid(db).id
    if "prime_offer" in steps and result.rebid_task_id:
        _offer_all_included(result.rebid_task_id, PRIME_A_ID, PRIME_A_OFFER_MINOR, "Cleared staff ready; can start in 30 days.", db)
    if "prime_owns" in steps and result.rebid_task_id:
        _accept_only_offer(result.rebid_task_id, GOVCON_ID, db)
    if "piece_published" in steps and result.rebid_task_id:
        piece = _split_suggested_piece(result.rebid_task_id, db)
        _publish(piece, PRIME_A_ID, db, TaskPublishChoices(bidding_mode="sealed", show_price=False))
        result.piece_task_id = piece.id
    if "sub_offer" in steps and result.piece_task_id:
        _offer_all_included(result.piece_task_id, SUB_B_ID, SUB_B_OFFER_MINOR, "ATO and ConMon specialists, Secret cleared.", db)
    if "sub_owns" in steps and result.piece_task_id:
        _accept_only_offer(result.piece_task_id, PRIME_A_ID, db)
    return result


def _publish_rebid(db: Session) -> Task:
    expense = db.scalar(
        select(ServiceExpense).where(ServiceExpense.owner_account_id == GOVCON_ID, ServiceExpense.normalized_vendor == DEVSECOPS_VENDOR)
    )
    if expense is None:
        raise LookupError("The GovCon ledger import did not produce the DevSecOps Support expense")
    _, _, task = confirm_rebid_scope(expense, devsecops_rebid_draft(), PublishChoices(bidding_mode="sealed"), db)
    _, payload_hash = preview_any(task, GOVCON_ID, db)
    publish_any(task, payload_hash, GOVCON_ID, db)
    return task


def _publish(task: Task, poster_id: str, db: Session, choices: TaskPublishChoices) -> None:
    # The same confirm → exact preview → publish-with-hash sequence the task page runs.
    confirm_task_scope(task, choices, poster_id, db)
    _, payload_hash = preview_any(task, poster_id, db)
    publish_any(task, payload_hash, poster_id, db)


def _offer_all_included(task_id: str, bidder_id: str, price_minor: int, message: str, db: Session) -> None:
    listing = listing_for_task(task_id, db)
    if listing is None:
        raise LookupError(f"Task {task_id} has no listing to bid on")
    submit_challenge(
        listing.id,
        bidder_id,
        {
            "acknowledged_bidding_mode": listing.bidding_mode,
            "price_minor": price_minor,
            "billing_frequency": "annual",
            "requirement_responses": [
                {"requirement_key": row.requirement_key, "is_included": True}
                for row in load_requirements(listing.scope_version_id, db)
            ],
            "message_to_owner": message,
        },
        db,
    )


def _accept_only_offer(task_id: str, poster_id: str, db: Session) -> None:
    listing = listing_for_task(task_id, db)
    offer = db.scalar(select(Challenge).where(Challenge.listing_id == listing.id, Challenge.is_active.is_(True))) if listing else None
    if offer is None:
        raise LookupError(f"Task {task_id} has no offer to accept")
    accept_offer(task_id, offer.id, poster_id, False, db)


def _split_suggested_piece(parent_task_id: str, db: Session) -> Task:
    parent = db.get(Task, parent_task_id)
    if parent is None:
        raise LookupError(f"Task {parent_task_id} not found")
    suggestions = [card for card in current_cards(parent, PRIME_A_ID, db) if card.tier == "potential_savings" and card.status == "suggested"]
    if not suggestions or suggestions[0].suggested_cut_minor is None:
        raise LookupError("Ways to save produced no suggestion for Prime A; check the fixture rates and demo market data")
    card = suggestions[0]
    inputs = CardInputs.model_validate_json(card.inputs_json)
    split = split_off_piece(
        parent.id,
        PRIME_A_ID,
        SplitRequest(
            title="ATO package and continuous monitoring",
            requirement_keys=[requirement.key for requirement in inputs.requirements],
            cut_minor=card.suggested_cut_minor,
            currency=parent.currency,
            billing_period=parent.billing_period,
            entry_point=SplitEntryPoint.suggested.value,
            savings_card_id=card.id,
        ),
        db,
    )
    child = db.get(Task, split.child_task_id)
    if child is None:
        raise LookupError("The split did not create its piece")
    return child
