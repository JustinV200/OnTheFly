/* The app's small inline-SVG icon set, drawn on a 24px grid in the text colour.
   Icons are always decorative (aria-hidden): the words beside them carry the meaning, so nothing depends on the glyph.
   The stroke drawings live in iconPaths.tsx; this file only renders them (and the filled fly, which doubles as the brand glyph). */
import { STROKE_PATHS, StrokeIconName } from './iconPaths';

export type IconName = StrokeIconName | 'fly';

interface IconProps {
  name: IconName;
  // Pixel size of the square icon; 16 matches body text.
  size?: number;
  className?: string;
}

/** Render one decorative icon. The fly is filled; the rest are 2px strokes. */
export function Icon({ name, size = 16, className }: IconProps): JSX.Element {
  if (name === 'fly') {
    return (
      <svg aria-hidden="true" className={className} fill="currentColor" focusable="false" height={size} viewBox="0 0 24 24" width={size}>
        <ellipse cx="7.4" cy="14" fillOpacity="0.5" rx="3.1" ry="6.6" transform="rotate(38 7.4 14)" />
        <ellipse cx="16.6" cy="14" fillOpacity="0.5" rx="3.1" ry="6.6" transform="rotate(-38 16.6 14)" />
        <ellipse cx="12" cy="13" rx="2.8" ry="6.2" />
        <circle cx="12" cy="5.4" r="2.6" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}
    >
      {STROKE_PATHS[name]}
    </svg>
  );
}
