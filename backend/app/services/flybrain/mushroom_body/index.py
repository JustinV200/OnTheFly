"""Retrieves the nearest stored items to a query using FlyHash candidates and exact re-ranking.
The hash narrows the search, and exact cosine decides the order, so approximation never changes results.
"""

from dataclasses import dataclass
from typing import Generic, TypeVar

from app.services.flybrain.mushroom_body.flyhash import FlyHash, KenyonTag, tag_similarity
from app.services.flybrain.sparse_vector import SparseVector, cosine_similarity

ItemKey = TypeVar("ItemKey")


@dataclass(frozen=True, slots=True)
class IndexMatch(Generic[ItemKey]):
    """One retrieval result with both the hash overlap and the exact similarity."""

    key: ItemKey
    tag_overlap: float
    similarity: float


class FlyHashIndex(Generic[ItemKey]):
    """An in-memory similarity index keyed by caller-chosen identifiers.

    Candidates are items sharing at least one Kenyon cell with the query, found
    through an inverted index from cell to items. At the sizes this product handles
    (tens of vendors, hundreds of listings) every related item is a candidate, so
    results match an exhaustive exact search. Past that size, the inverted index is
    what keeps a query from scanning everything.
    """

    def __init__(self, flyhash: FlyHash) -> None:
        self._flyhash = flyhash
        self._vectors: dict[ItemKey, SparseVector] = {}
        self._tags: dict[ItemKey, KenyonTag] = {}
        self._items_by_cell: dict[int, set[ItemKey]] = {}

    def add(self, key: ItemKey, vector: SparseVector) -> None:
        """Store one item; re-adding a key replaces its previous vector."""

        if key in self._tags:
            self._remove(key)
        tag = self._flyhash.tag(vector)
        self._vectors[key] = vector
        self._tags[key] = tag
        for cell in tag:
            self._items_by_cell.setdefault(cell, set()).add(key)

    def query(
        self,
        vector: SparseVector,
        limit: int,
        min_similarity: float,
        exclude: set[ItemKey] | None = None,
    ) -> list[IndexMatch[ItemKey]]:
        """Return up to limit stored items at or above min_similarity, best first.

        Ties on exact similarity fall back to tag overlap and then to the key's string
        form, so the order is fully deterministic.
        """

        query_tag = self._flyhash.tag(vector)
        excluded = exclude or set()
        candidates: set[ItemKey] = set()
        for cell in query_tag:
            candidates.update(self._items_by_cell.get(cell, set()))

        matches = []
        for key in candidates - excluded:
            similarity = cosine_similarity(vector, self._vectors[key])
            if similarity < min_similarity:
                continue
            matches.append(
                IndexMatch(
                    key=key,
                    tag_overlap=tag_similarity(query_tag, self._tags[key]),
                    similarity=similarity,
                )
            )
        matches.sort(key=lambda match: (-match.similarity, -match.tag_overlap, str(match.key)))
        return matches[:limit]

    def _remove(self, key: ItemKey) -> None:
        for cell in self._tags.pop(key):
            items = self._items_by_cell.get(cell)
            if items is None:
                continue
            items.discard(key)
            if not items:
                del self._items_by_cell[cell]
        del self._vectors[key]
