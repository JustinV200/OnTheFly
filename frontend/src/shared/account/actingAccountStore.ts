/* Holds which seeded demo business this tab acts as; null means a signed-out public visitor.
   Each tab keeps its own choice in memory. localStorage only seeds a new tab with the last choice,
   so a switch in one window never changes who another open window acts as.
   Demo identity only, with no authentication (CLAUDE.md, "No authentication work"). */
const STORAGE_KEY = 'actingAccountId';

// Read once at module load, never again: another tab's later write must not reach this tab's header.
let currentId: string | null = readStoredId();

/** Reads and writes this tab's acting account id; storage failures degrade to the public visitor. */
export const actingAccountStore = {
  /** Return this tab's account id, or null for a public visitor (also the cold-session default). */
  read(): string | null {
    return currentId;
  },

  /** Set this tab's account id, or clear it to act as a public visitor, and remember it for new tabs. */
  write(accountId: string | null): void {
    // Memory is updated first so the header follows the tab's own choice even if storage refuses it.
    currentId = accountId;
    try {
      if (accountId === null) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, accountId);
      }
    } catch (error) {
      console.warn('Could not store the acting account; new tabs will not start with it', error);
    }
  },
};

function readStoredId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    // Private-mode browsers can refuse storage; acting as nobody is the safe fallback.
    console.warn('Could not read the acting account from storage', error);
    return null;
  }
}
