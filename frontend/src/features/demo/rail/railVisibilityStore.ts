/* Remembers whether the presenter hid the demo steps rail. A device preference like the theme, so it lives in
   localStorage; one in-memory value is shared by the rail and the demo guide's "Show demo steps" button, so either
   change shows at once. Storage failures degrade to shown: a visible presenter tool is the recoverable state. */
const STORAGE_KEY = 'demoRailHidden';

let isHidden = readStored();
const listeners = new Set<() => void>();

/** Read, change, and subscribe to the rail's hidden flag. */
export const railVisibilityStore = {
  /** Return true when the presenter hid the rail. */
  read(): boolean {
    return isHidden;
  },

  /** Hide or show the rail for this device, and tell subscribers. */
  write(nextIsHidden: boolean): void {
    isHidden = nextIsHidden;
    try {
      if (nextIsHidden) {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      // The rail still hides or shows for this visit; only remembering it failed.
      console.warn('Could not store whether the demo steps rail is hidden; it will reset on reload', error);
    }
    listeners.forEach((listener) => listener());
  },

  /** Subscribe to changes; returns the unsubscribe function (the useSyncExternalStore contract). */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (error) {
    console.warn('Could not read whether the demo steps rail is hidden; showing it', error);
    return false;
  }
}
