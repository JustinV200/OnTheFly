/* A term with a plain-language explanation ("Keep cost", "Remainder"): dotted underline, focusable, and a tooltip on
   hover or keyboard focus. The explanation is the term's accessible description, so a screen reader hears it on focus
   without hovering, and Escape hides it without moving focus (WCAG 1.4.13). Never use it to hide an honesty label: those
   stay visible on the page; this only explains a word. */
import { KeyboardEvent, ReactNode, useId, useState } from 'react';

import { joinClassNames } from '../joinClassNames';
import './TermHint.css';

interface TermHintProps {
  // The term as it reads on screen.
  children: ReactNode;
  // One plain sentence saying what the term means.
  hint: string;
  className?: string;
}

/** Render a term with its explanation available on hover, focus and to assistive tech. */
export function TermHint({ children, hint, className }: TermHintProps): JSX.Element {
  const tipId = useId();
  const [isDismissed, setIsDismissed] = useState(false);

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>): void => {
    if (event.key === 'Escape') {
      setIsDismissed(true);
    }
  };

  return (
    <span
      className={joinClassNames('ui-term-hint', isDismissed && 'ui-term-hint--dismissed', className)}
      onMouseLeave={() => setIsDismissed(false)}
    >
      <span aria-describedby={tipId} className="ui-term-hint__term" onBlur={() => setIsDismissed(false)} onKeyDown={onKeyDown} tabIndex={0}>
        {children}
      </span>
      {/* Hidden from view until hover or focus; aria-describedby still reads hidden text, so it is announced on focus. */}
      <span className="ui-term-hint__tip" id={tipId} role="tooltip">{hint}</span>
    </span>
  );
}
