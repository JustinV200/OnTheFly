"""Validate the subset of Stripe fields needed for sandbox imports."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Customer(BaseModel):
    id: str
    livemode: Literal[False]


class Holder(BaseModel):
    customer: str


class Refresh(BaseModel):
    status: Literal["pending", "succeeded", "failed"]
    next_refresh_available_at: int | None = None


class BankAccount(BaseModel):
    id: str
    livemode: Literal[False]
    account_holder: Holder
    status: str
    permissions: list[str]
    transaction_refresh: Refresh | None = None


class Accounts(BaseModel):
    data: list[BankAccount]
    has_more: bool = False


class ConnectionSession(BaseModel):
    id: str
    livemode: Literal[False]
    account_holder: Holder
    client_secret: str | None = None
    accounts: Accounts


class StripeTransaction(BaseModel):
    # Retain optional provider fields in raw_payload for later evidence inspection.
    model_config = ConfigDict(extra="allow")
    id: str
    account: str
    livemode: Literal[False]
    amount: int = Field(strict=True)
    currency: str
    description: str
    status: Literal["pending", "posted", "void"]
    transacted_at: int
    updated: int


class Transactions(BaseModel):
    data: list[StripeTransaction]
    has_more: bool
