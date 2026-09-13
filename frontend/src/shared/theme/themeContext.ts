/* The React context the theme provider fills and useTheme reads. Its own module so neither file imports the other. */
import { createContext } from 'react';

import type { ResolvedTheme, ThemePreference } from './themeStore';

export interface ThemeValue {
  // What the viewer chose, including "system".
  preference: ThemePreference;
  // What is actually on screen now.
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeValue | null>(null);
