/* Light / Dark / System, as three icon segments. "System" follows the operating system and keeps following it. */
import { Icon, SegmentedControl, SegmentedOption } from '../ui';
import type { ThemePreference } from './themeStore';
import { useTheme } from './useTheme';

const OPTIONS: SegmentedOption<ThemePreference>[] = [
  { value: 'light', label: 'Light theme', icon: <Icon name="sun" size={15} />, isLabelHidden: true },
  { value: 'dark', label: 'Dark theme', icon: <Icon name="moon" size={15} />, isLabelHidden: true },
  { value: 'system', label: 'Match system theme', icon: <Icon name="monitor" size={15} />, isLabelHidden: true },
];

interface ThemeToggleProps {
  className?: string;
}

/** Render the theme choice for this device. */
export function ThemeToggle({ className }: ThemeToggleProps): JSX.Element {
  const { preference, setPreference } = useTheme();
  return <SegmentedControl className={className} label="Theme" onChange={setPreference} options={OPTIONS} size="sm" value={preference} />;
}
