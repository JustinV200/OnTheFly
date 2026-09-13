/* Reads the theme preference and setter. Components should rarely need this: colours come from tokens,
   so only the toggle (and anything that must draw outside CSS, like a canvas) reads the resolved theme. */
import { useContext } from 'react';

import { ThemeContext, ThemeValue } from './themeContext';

/** Return the theme preference, the resolved theme, and the setter; must be used under ThemeProvider. */
export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return value;
}
