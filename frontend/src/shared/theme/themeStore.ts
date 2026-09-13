/* Remembers the viewer's theme preference on this device. Unlike the acting business, theme is a device preference,
   so every tab shares one stored value and follows changes made in another tab (see ThemeProvider).
   Storage failures degrade to "system", which still gives a readable page. */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

// The inline script in index.html reads this same key before React mounts; keep the two in sync.
export const THEME_STORAGE_KEY = 'theme';

/** Parse a stored value; anything unrecognised (or missing) means "follow the operating system". */
export function parseThemePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** Read and write the stored preference. */
export const themeStore = {
  /** Return the stored preference, or "system" when nothing is stored or storage is unavailable. */
  read(): ThemePreference {
    try {
      return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch (error) {
      console.warn('Could not read the theme preference; following the system theme', error);
      return 'system';
    }
  },

  /** Store the preference. "system" removes the key, so a later OS change is followed again. */
  write(preference: ThemePreference): void {
    try {
      if (preference === 'system') {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        window.localStorage.setItem(THEME_STORAGE_KEY, preference);
      }
    } catch (error) {
      // The page still switches for this visit; only remembering it failed.
      console.warn('Could not store the theme preference; it will reset on reload', error);
    }
  },
};
