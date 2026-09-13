"""Describes one ranked offer as two smells for the browser's simulated fly brain: what the owner pays now, then the offer.
The fruit fly's yes/no and rating are read off the simulated spikes in the browser (features/brainview/opinion); this
module only builds the input. It reads figures the ranking already computed and decides nothing about money or acceptance.
"""

from app.services.comparison.rank import RankedChallenge
from app.services.flybrain import (
    BrainStimulus,
    FlyBrainComponent,
    SensoryInput,
    SparseVector,
    StimulusInput,
    build_brain_stimulus,
    encode_tokens,
    merge_vectors,
    scale_vector,
)

# The brain file's olfactory input table has 1,024 receptor channels (frontend/scripts/flybrain-data/README.md).
OPINION_INPUT_DIM = 1024

# The two trials, in this order; the browser reads the first as "now" and the second as "the offer". Fixed words: a
# caption never carries a name, an amount or scope text.
NOW_CAPTION = "What you pay now"
OFFER_CAPTION = "This offer"
RESULT_LABEL = "The fruit fly's opinion"

# Price is a thermometer code: "what you pay now" drives PRICE_RECEPTORS_AT_BASELINE channels; an offer drives that
# many scaled by its monthly price over the baseline, so a cheaper offer is a fainter smell and a dearer one stronger.
# The top channel is driven partially, so a 3% cheaper offer still smells fainter rather than rounding to the same
# code. Offers at MAX_PRICE_RECEPTORS / PRICE_RECEPTORS_AT_BASELINE times the baseline (2x) or more all hit the cap.
PRICE_RECEPTORS_AT_BASELINE = 8
MAX_PRICE_RECEPTORS = 16

# Each requirement the offer leaves out adds this many channels of its own, and each it doesn't mention adds one: a
# gap is a stronger whiff than a few percent of price, which keeps scope ahead of price as everywhere else in the app.
RECEPTORS_PER_MISSING_ITEM = 3
RECEPTORS_PER_UNSTATED_ITEM = 1


def fly_opinion_stimulus(row: RankedChallenge) -> BrainStimulus | None:
    """Return the two-trial stimulus for one ranked offer, or None when there is nothing to compare it against.

    None for the incumbent row, an unranked offer (its currency didn't match), and a task with no baseline price:
    the fly is only asked to compare, never to judge an offer on its own. Both trials share one receptor space.
    """

    if row.is_incumbent or row.unranked_reason is not None:
        return None
    if row.baseline_monthly is None or row.normalized_price is None or row.baseline_monthly.amount <= 0:
        return None

    now_receptors = price_receptors(PRICE_RECEPTORS_AT_BASELINE)
    offer_receptors = merge_vectors(
        price_receptors(offer_price_channels(row.normalized_price.amount, row.baseline_monthly.amount)),
        scope_gap_receptors(row.missing_items, row.unstated_items),
    )
    return build_brain_stimulus(
        RESULT_LABEL,
        [FlyBrainComponent.whole_brain_simulation],
        OPINION_INPUT_DIM,
        [
            [StimulusInput(sense=SensoryInput.olfactory, caption=NOW_CAPTION, vector=now_receptors)],
            [StimulusInput(sense=SensoryInput.olfactory, caption=OFFER_CAPTION, vector=offer_receptors)],
        ],
    )


def offer_price_channels(offer_monthly_minor: int, baseline_monthly_minor: int) -> float:
    """Return how many price channels an offer drives: the baseline's count scaled by the price ratio, capped."""

    ratio = offer_monthly_minor / baseline_monthly_minor
    return max(0.0, min(float(MAX_PRICE_RECEPTORS), PRICE_RECEPTORS_AT_BASELINE * ratio))


def price_receptors(channels: float) -> SparseVector:
    """Encode a channel count as a thermometer: whole channels at full strength, the fractional one partially."""

    steps: list[SparseVector] = []
    for position in range(MAX_PRICE_RECEPTORS):
        activation = min(1.0, channels - position)
        if activation <= 0:
            break
        # Fixed channel names, so "now" and "the offer" share the same receptors up to where they differ.
        steps.append(scale_vector(encode_tokens([str(position)], "opinion:price", OPINION_INPUT_DIM), activation))
    return merge_vectors(*steps)


def scope_gap_receptors(missing_items: list[str], unstated_items: list[str]) -> SparseVector:
    """Encode scope gaps as one full-strength receptor per gap channel, keyed by the requirement each gap is."""

    missing = [f"{item}:{position}" for item in missing_items for position in range(RECEPTORS_PER_MISSING_ITEM)]
    unstated = [f"{item}:{position}" for item in unstated_items for position in range(RECEPTORS_PER_UNSTATED_ITEM)]
    return merge_vectors(
        encode_tokens(missing, "opinion:missing", OPINION_INPUT_DIM),
        encode_tokens(unstated, "opinion:unstated", OPINION_INPUT_DIM),
    )
