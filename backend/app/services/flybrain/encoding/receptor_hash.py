"""Maps named features onto receptor indices with a process-stable hash.
Python's built-in hash() is salted per process, so it would give a different tag on every restart.
"""

import zlib


def receptor_index(channel: str, feature: str, receptor_count: int) -> int:
    """Return the receptor index for one feature within a named channel.

    The channel name is mixed into the key so that, for example, the word "clean"
    in a vendor name and the same word in a memo land on unrelated receptors when
    two channels share one input space.
    """

    if receptor_count <= 0:
        raise ValueError("receptor_count must be positive")
    key = f"{channel}\x1f{feature}".encode("utf-8")
    return zlib.crc32(key) % receptor_count
