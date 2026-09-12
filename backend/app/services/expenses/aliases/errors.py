"""Declares the error vendor-alias services raise for requests they refuse.
Services stay HTTP-free; the API layer maps this error to a 400 or 404 response.
"""


class AliasRequestError(ValueError):
    """A merge or dismissal the owner asked for that cannot be applied as requested."""

    def __init__(self, message: str, is_not_found: bool = False) -> None:
        super().__init__(message)
        self.is_not_found = is_not_found
