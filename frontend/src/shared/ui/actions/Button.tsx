/* The app's button: primary, secondary, ghost, danger, or link-styled, in three sizes.
   Busy keeps the label visible beside a spinner and disables the button, so a slow request never looks like a dead click
   and can't be sent twice. It defaults to type="button"; pass type="submit" inside a form. */
import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

import { Spinner } from '../loading/Spinner';
import { buttonClassName, ButtonSize, ButtonVariant } from './buttonClassName';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  // In flight: shows a spinner, sets aria-busy, and disables. Change the label too ("Publishing…") so it reads as progress.
  isBusy?: boolean;
  isFullWidth?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
}

/** Render a styled native button; every native button prop passes through. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', isBusy = false, isFullWidth = false, iconStart, iconEnd, className, disabled, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      aria-busy={isBusy || undefined}
      className={buttonClassName({ variant, size, isFullWidth, className })}
      disabled={disabled || isBusy}
      ref={ref}
      type={type}
    >
      {isBusy ? <Spinner size="sm" /> : iconStart}
      <span className="ui-button__label">{children}</span>
      {iconEnd}
    </button>
  );
});
