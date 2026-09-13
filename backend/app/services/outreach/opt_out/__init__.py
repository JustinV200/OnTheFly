"""The public opt-out link: describe what it will do, then suppress the address."""

from app.services.outreach.opt_out.apply import OptOutResult, apply_opt_out
from app.services.outreach.opt_out.describe import OptOutDescription, describe_opt_out, mask_email

__all__ = ["OptOutDescription", "OptOutResult", "apply_opt_out", "describe_opt_out", "mask_email"]
