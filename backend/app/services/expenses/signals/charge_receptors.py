"""Encodes one charge as receptor activations for the fly-brain circuits and the live brain panel.
Novelty scoring and the brain stimulus both call these, so the panel replays exactly the codes the filter consumed.
"""

from app.models.transaction import Transaction
from app.services.flybrain import SparseVector, encode_log_magnitude, encode_trigrams, text_words

# 2% receptor bands responding two bands either side: nearby amounts share receptors.
AMOUNT_STEP_RATIO = 1.02
AMOUNT_SPREAD = 2


def charge_amount_receptors(transaction: Transaction, receptor_count: int) -> SparseVector:
    """Encode a charge's amount for the novelty filter; the amount must be positive."""

    # Currency and direction are part of the channel name, so a refund never reads as
    # familiar because a charge of the same size was seen, and USD never matches EUR.
    channel = f"amount:{transaction.direction}:{transaction.currency}"
    return encode_log_magnitude(
        float(transaction.amount_minor),
        channel=channel,
        receptor_count=receptor_count,
        step_ratio=AMOUNT_STEP_RATIO,
        spread=AMOUNT_SPREAD,
    )


def charge_description_receptors(transaction: Transaction, receptor_count: int) -> SparseVector:
    """Encode a charge's description and memo as trigrams; empty when no word survives."""

    # Words containing digits are dropped: invoice numbers, store numbers, and dates
    # change on every charge and would make each one look novel.
    text = f"{transaction.raw_description} {transaction.memo or ''}"
    words = [word for word in text_words(text) if not any(character.isdigit() for character in word)]
    return encode_trigrams(words, channel="description", receptor_count=receptor_count)


def compound_eye_amount_receptors(transaction: Transaction, receptor_count: int) -> SparseVector:
    """Encode a charge's amount as the visual input the brain panel plays for the Compound Eye.

    The Compound Eye itself reads the raw amount, not receptors, so this population code is
    how the panel presents that same amount. Its channel is distinct from the novelty
    amount channel, so the eye's and the nose's codes for one charge never coincide. The
    amount must be positive.
    """

    return encode_log_magnitude(
        float(transaction.amount_minor),
        channel=f"eye:amount:{transaction.direction}:{transaction.currency}",
        receptor_count=receptor_count,
        # Same resolution as the novelty amount channel: a 2% move reads as different to both.
        step_ratio=AMOUNT_STEP_RATIO,
        spread=AMOUNT_SPREAD,
    )
