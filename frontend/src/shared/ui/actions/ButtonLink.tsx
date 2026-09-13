/* A router link styled as a button, for navigation that is the main action ("Challenge this price").
   It stays a real link: middle-click, copy address, and screen readers all treat it as navigation, not a command. */
import type { ReactNode } from 'react';
import { Link, LinkProps } from 'react-router-dom';

import { buttonClassName, ButtonSize, ButtonVariant } from './buttonClassName';
import './Button.css';

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isFullWidth?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
}

/** Render a react-router Link with button styling. */
export function ButtonLink({ variant = 'secondary', size = 'md', isFullWidth = false, iconStart, iconEnd, className, children, ...rest }: ButtonLinkProps): JSX.Element {
  return (
    <Link {...rest} className={buttonClassName({ variant, size, isFullWidth, className })}>
      {iconStart}
      <span className="ui-button__label">{children}</span>
      {iconEnd}
    </Link>
  );
}
