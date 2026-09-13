"""Declares the error the expense corrections service raises for an owner request it refuses.
Services stay HTTP-free; the API layer maps this error to a 400 response.
"""


class ExpenseCorrectionError(ValueError):
    """An owner correction that cannot be applied as requested, such as making a hard exclusion publishable."""
