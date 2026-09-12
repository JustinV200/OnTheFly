/* Persists which seeded demo business the viewer acts as; null means a signed-out public visitor.
   Demo identity only, with no authentication (CLAUDE.md, "No authentication work"). */
const STORAGE_KEY = 'actingAccountId';

/** Reads and writes the acting account id; storage failures degrade to the public visitor. */
export const actingAccountStore = {
  /** Return the stored account id, or null for a public visitor (also the cold-session default). */
  read(): string | null {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      // Private-mode browsers can refuse storage; acting as nobody is the safe fallback.
      console.warn('Could not read the acting account from storage', error);
      return null;
    }
  },

  /** Store the account id, or clear it to act as a public visitor. */
  write(accountId: string | null): void {
    try {
      if (accountId === null) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, accountId);
      }
    } catch (error) {
      console.warn('Could not store the acting account', error);
    }
  },
};
