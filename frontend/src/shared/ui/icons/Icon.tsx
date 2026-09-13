/* The app's small inline-SVG icon set, drawn on a 24px grid in the text colour.
   Icons are always decorative (aria-hidden): the words beside them carry the meaning, so nothing depends on the glyph. */
import type { ReactElement } from 'react';

export type IconName =
  | 'alert-circle'
  | 'alert-triangle'
  | 'check'
  | 'check-circle'
  | 'chevron-down'
  | 'eye'
  | 'fly'
  | 'info'
  | 'lock';

const STROKE_PATHS: Record<Exclude<IconName, 'fly'>, ReactElement> = {
  'alert-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16 10" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5h.01" />
    </>
  ),
  lock: (
    <>
      <rect height="10" rx="2" width="14" x="5" y="10.5" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  // Pixel size of the square icon; 16 matches body text.
  size?: number;
  className?: string;
}

/** Render one decorative icon. The fly is filled (it doubles as the brand glyph); the rest are 2px strokes. */
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
