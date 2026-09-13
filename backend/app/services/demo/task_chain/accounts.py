"""Names the three demo accounts of the task chain (plan2, "Demo"). Must match SEEDED_ACCOUNTS in app/db/seed.py."""

GOVCON_ID = "acc_govcon_1"
PRIME_A_ID = "acc_prime_a"
SUB_B_ID = "acc_sub_b"

CHAIN_ACCOUNT_IDS = (GOVCON_ID, PRIME_A_ID, SUB_B_ID)

# GovCon's synthetic ledger vendor whose expense the demo REBIDs (backend/app/services/transactions/fixture/GOVCON.md).
DEVSECOPS_VENDOR = "DevSecOps Support"
# The fixture connection GovCon's ledger imports through (app/cli/seed_govcon_demo.py uses the same id).
GOVCON_PROVIDER_ACCOUNT_ID = "fixture_govcon_main"
