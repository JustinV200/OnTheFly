/* Resolves a preference to light or dark and applies it to the document root, where the theme CSS reads it.
   The same logic runs once in index.html before React mounts (so a dark-mode viewer never sees a white flash);
   this module takes over after mount. */
import type { ResolvedTheme, ThemePreference } from './themeStore';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Return the media query list for the OS dark-mode setting, or null where matchMedia is unavailable. */
export function systemDarkQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
}

/** Resolve "system" against the OS setting; explicit choices pass through. */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') {
    return preference;
  }
  return systemDarkQuery()?.matches ? 'dark' : 'light';
}

/** Set data-theme on <html> and keep the browser chrome colour in step with the canvas. */
export function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  // The meta tag colours mobile browser chrome; read the canvas token so it matches the page in either theme.
  const canvas = getComputedStyle(root).getPropertyValue('--color-canvas').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && canvas) {
    meta.setAttribute('content', canvas);
  }
}
