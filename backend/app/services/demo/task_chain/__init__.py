"""The GovCon → Prime A → Sub B task-chain demo: fixture rates, demo scopes, reset and staging (plan2, "Demo")."""

from app.services.demo.task_chain.reset import GenuineOfferPresentError, clear_task_chain
from app.services.demo.task_chain.stages import STAGE_ORDER, Stage, StagedChain, stage_task_chain

__all__ = ["STAGE_ORDER", "GenuineOfferPresentError", "Stage", "StagedChain", "clear_task_chain", "stage_task_chain"]
