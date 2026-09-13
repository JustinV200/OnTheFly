/* A bordered surface that groups one topic, with an optional header row (title, description, actions).
   With a title it is a labelled region, so screen-reader users can jump between cards by name. */
import { ReactNode, useId } from 'react';

import { joinClassNames } from '../joinClassNames';
import './Card.css';

interface CardProps {
  title?: ReactNode;
  // Pick the level that fits the page outline: 2 under a page h1, 3 inside another section.
  titleLevel?: 2 | 3 | 4;
  description?: ReactNode;
  // Buttons or badges aligned to the header's end; they wrap below the title on a phone.
  actions?: ReactNode;
  // default: white surface. subtle: sunken grey, for secondary groupings inside a page. outlined: no fill, dashed, for suggestions.
  tone?: 'default' | 'subtle' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'section' | 'article' | 'div' | 'aside';
  // Accessible name when there is no visible title (ignored for as="div").
  label?: string;
  className?: string;
  children?: ReactNode;
}

/** Render a card surface with an optional header. */
export function Card({ title, titleLevel = 2, description, actions, tone = 'default', padding = 'md', as: Element = 'section', label, className, children }: CardProps): JSX.Element {
  const titleId = useId();
  const Heading = `h${titleLevel}` as const;
  const hasHeader = Boolean(title || description || actions);
  // Only landmark-like elements take a name; ARIA doesn't allow naming a plain div.
  const isNameable = Element !== 'div';

  return (
    <Element
      aria-label={isNameable && !title ? label : undefined}
      aria-labelledby={isNameable && title ? titleId : undefined}
      className={joinClassNames('ui-card', `ui-card--${tone}`, `ui-card--pad-${padding}`, className)}
    >
      {hasHeader ? (
        <div className="ui-card__header">
          <div className="ui-card__heading">
            {title ? <Heading className="ui-card__title" id={titleId}>{title}</Heading> : null}
            {description ? <div className="ui-card__description">{description}</div> : null}
          </div>
          {actions ? <div className="ui-card__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Element>
  );
}
