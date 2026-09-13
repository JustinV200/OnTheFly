/* One icon button for the top bar that flips between light and dark. It sets an explicit choice; "Match system" stays
   one click away in the full ThemeToggle (in the account menu), so the bar spends 36px on theme instead of three segments. */
import { Icon, joinClassNames } from '../ui';
import './ThemeQuickToggle.css';
import { useTheme } from './useTheme';

interface ThemeQuickToggleProps {
  className?: string;
}

/** Render the light/dark flip button, labelled with what pressing it will do. */
export function ThemeQuickToggle({ className }: ThemeQuickToggleProps): JSX.Element {
  const { theme, setPreference } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} theme`;

  return (
    <button aria-label={label} className={joinClassNames('theme-quick-toggle', className)} onClick={() => setPreference(next)} title={label} type="button">
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
