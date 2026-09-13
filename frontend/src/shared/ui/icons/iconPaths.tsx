/* The stroke drawings behind <Icon>, on a 24px grid. Kept apart from the component so adding a glyph never touches
   rendering logic. Every glyph is decorative; the words beside an icon carry its meaning. */
import type { ReactElement } from 'react';

export type StrokeIconName =
  | 'alert-circle'
  | 'alert-triangle'
  | 'arrow-left'
  | 'arrow-right'
  | 'check'
  | 'check-circle'
  | 'chevron-down'
  | 'chevron-right'
  | 'clock'
  | 'copy'
  | 'external-link'
  | 'eye'
  | 'globe'
  | 'info'
  | 'lock'
  | 'mail'
  | 'maximize'
  | 'menu'
  | 'minimize'
  | 'monitor'
  | 'moon'
  | 'pause'
  | 'play'
  | 'plus'
  | 'replay'
  | 'search'
  | 'send'
  | 'sun'
  | 'trending-down'
  | 'users'
  | 'x';

export const STROKE_PATHS: Record<StrokeIconName, ReactElement> = {
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
  'arrow-left': <path d="M19 12H5M11 18l-6-6 6-6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16 10" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  copy: (
    <>
      <rect height="12" rx="2" width="12" x="9" y="9" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  'external-link': <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
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
  mail: (
    <>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </>
  ),
  maximize: <path d="M14 4h6v6M20 4l-6.5 6.5M10 20H4v-6M4 20l6.5-6.5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  minimize: <path d="M4 14h6v6M10 14l-6.5 6.5M20 10h-6V4M14 10l6.5-6.5" />,
  monitor: (
    <>
      <rect height="12" rx="2" width="18" x="3" y="4" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  pause: <path d="M9 5.5v13M15 5.5v13" />,
  play: <path d="M7.5 5.2v13.6a.6.6 0 0 0 .9.5l10.6-6.8a.6.6 0 0 0 0-1L8.4 4.7a.6.6 0 0 0-.9.5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  replay: <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4.5v4h4" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  send: <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  'trending-down': <path d="m3 7 7 7 4-4 7 7M21 11v6h-6" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
};
