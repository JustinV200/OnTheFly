/* Owns the theme preference for the app: applies it to <html>, follows the OS live while on "system",
   and follows a change made in another tab (theme is a device preference, unlike the acting business). */
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { applyTheme, resolveTheme, systemDarkQuery } from './applyTheme';
import { ThemeContext, ThemeValue } from './themeContext';
import { parseThemePreference, ResolvedTheme, THEME_STORAGE_KEY, ThemePreference, themeStore } from './themeStore';

/** Provide the theme preference and apply the resolved theme to the document. */
export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => themeStore.read());
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolveTheme(preference));

  // Re-resolve on every preference change, and while on "system" also when the OS setting flips.
  useEffect(() => {
    const update = (): void => setTheme(resolveTheme(preference));
    update();
    const query = systemDarkQuery();
    if (preference !== 'system' || !query) {
      return undefined;
    }
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [preference]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Another tab changed the stored preference: follow it. The storage event never fires in the tab that wrote.
  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setPreferenceState(parseThemePreference(event.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPreference = useCallback((next: ThemePreference): void => {
    themeStore.write(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo<ThemeValue>(() => ({ preference, theme, setPreference }), [preference, theme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
