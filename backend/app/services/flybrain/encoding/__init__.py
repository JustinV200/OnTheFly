"""Receptor encoders that turn text and magnitudes into sparse vectors for the fly-brain circuits."""

from app.services.flybrain.encoding.magnitude import encode_log_magnitude
from app.services.flybrain.encoding.text import encode_tokens, encode_trigrams, text_words

__all__ = ["encode_log_magnitude", "encode_tokens", "encode_trigrams", "text_words"]
