"""Checks the receptor encoders that feed the fly-brain circuits."""

import pytest

from app.services.flybrain import cosine_similarity, encode_log_magnitude, encode_tokens, encode_trigrams, text_words


def _amount(value: float) -> dict[int, float]:
    return encode_log_magnitude(value, "amount", 1024, step_ratio=1.02, spread=2)


def test_magnitude_code_is_relative_not_absolute() -> None:
    small_pair = cosine_similarity(_amount(18500), _amount(18900))
    large_pair = cosine_similarity(_amount(240000), _amount(245000))

    assert small_pair > 0.5
    assert large_pair > 0.5
    assert cosine_similarity(_amount(240000), _amount(300000)) == 0.0


def test_magnitude_code_rejects_invalid_input() -> None:
    with pytest.raises(ValueError):
        _amount(0)
    with pytest.raises(ValueError):
        encode_log_magnitude(10.0, "amount", 1024, step_ratio=1.0, spread=2)


def test_trigrams_tolerate_suffixes_but_tokens_do_not() -> None:
    assert cosine_similarity(
        encode_trigrams(["cleaning"], "text", 1024), encode_trigrams(["clean"], "text", 1024)
    ) > 0.5
    assert cosine_similarity(
        encode_tokens(["2x weekly"], "text", 1024), encode_tokens(["3x weekly"], "text", 1024)
    ) == 0.0


def test_channels_keep_the_same_word_apart() -> None:
    assert cosine_similarity(
        encode_trigrams(["clean"], "vendor_name", 1024), encode_trigrams(["clean"], "description", 1024)
    ) < 0.5


def test_text_words_splits_on_punctuation_and_casefolds() -> None:
    assert text_words("SQ *SPARKLE-Clean #12") == ["sq", "sparkle", "clean", "12"]
