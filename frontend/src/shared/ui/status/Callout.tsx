/* A tinted message block: bidding terms before a form, a disclosure warning, a failed load, a completed import.
   The icon is decorative and the title names the state, so the meaning survives without colour. */
import type { ReactNode } from 'react';

import { Icon, IconName } from '../icons/Icon';
import { joinClassNames } from '../joinClassNames';
import './Callout.css';

export type CalloutTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'simulated' | 'private' | 'brand';

const TONE_ICONS: Record<CalloutTone, IconName> = {
  neutral: 'info',
  info: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  simulated: 'alert-triangle',
  private: 'lock',
  brand: 'fly',
};

interface CalloutProps {
  tone?: CalloutTone;
  title?: ReactNode;
  // Callouts usually sit inside a section, so the title defaults to h3. Use 2 when it is a top-level page block.
  titleLevel?: 2 | 3 | 4;
  // alert: an error or a warning the user must see now. status: a result that just happened. note: standing terms.
  role?: 'alert' | 'status' | 'note';
  // Override the tone's icon, or pass false for none.
  icon?: IconName | false;
  actions?: ReactNode;
  as?: 'div' | 'section' | 'aside';
  // Accessible name; applied only to a section or aside, since ARIA doesn't allow naming a plain div.
  label?: string;
  className?: string;
  children?: ReactNode;
}

/** Render a callout with an icon, optional title, body, and actions. */
export function Callout({ tone = 'info', title, titleLevel = 3, role, icon, actions, as: Element = 'div', label, className, children }: CalloutProps): JSX.Element {
  const Heading = `h${titleLevel}` as const;
  const iconName = icon === false ? null : icon ?? TONE_ICONS[tone];

  return (
    <Element aria-label={Element === 'div' ? undefined : label} className={joinClassNames('ui-callout', `ui-callout--${tone}`, className)} role={role}>
      {iconName ? <Icon className="ui-callout__icon" name={iconName} size={18} /> : null}
      <div className="ui-callout__content">
        {title ? <Heading className="ui-callout__title">{title}</Heading> : null}
        {children ? <div className="ui-callout__body">{children}</div> : null}
        {actions ? <div className="ui-callout__actions">{actions}</div> : null}
      </div>
    </Element>
  );
}
