/* A small rotating ring for "this is working". Decorative: the caller always pairs it with words
   (a busy button's label, a named loading status), so a spinner never stands alone as the only signal. */
import { joinClassNames } from '../joinClassNames';
import './Spinner.css';

interface SpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

/** Render an aria-hidden spinning ring in the current text colour. */
export function Spinner({ size = 'md', className }: SpinnerProps): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={joinClassNames('ui-spinner', `ui-spinner--${size}`, className)}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" opacity="0.22" r="9" stroke="currentColor" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}
