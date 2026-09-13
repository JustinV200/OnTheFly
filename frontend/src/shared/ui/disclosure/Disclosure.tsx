/* "Answer first, evidence on demand": a one-line summary that expands to the rule, assumption, or record behind it.
   Native <details>, so it is keyboard- and screen-reader-operable with no script, and find-in-page can open it.
   Never put an honesty label itself in here, only its explanation (roadmap 11, "Design principles"). */
import type { ReactNode } from 'react';

import { Icon } from '../icons/Icon';
import { joinClassNames } from '../joinClassNames';
import './Disclosure.css';

interface DisclosureProps {
  // The always-visible line, e.g. "Why?" or "How ranking works".
  summary: ReactNode;
  children: ReactNode;
  isDefaultOpen?: boolean;
  // "inline" is a quiet text link; "card" is a bordered row, for evidence lists and expanded table rows.
  variant?: 'inline' | 'card';
  className?: string;
}

/** Render a collapsible explanation. */
export function Disclosure({ summary, children, isDefaultOpen = false, variant = 'inline', className }: DisclosureProps): JSX.Element {
  return (
    <details className={joinClassNames('ui-disclosure', `ui-disclosure--${variant}`, className)} open={isDefaultOpen}>
      <summary className="ui-disclosure__summary">
        <Icon className="ui-disclosure__chevron" name="chevron-right" size={14} />
        <span>{summary}</span>
      </summary>
      <div className="ui-disclosure__body">{children}</div>
    </details>
  );
}
