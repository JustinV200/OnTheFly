/* Builds the class list shared by Button and ButtonLink, so a link that acts like a button looks exactly like one. */
import { joinClassNames } from '../joinClassNames';

// primary: the one main action on a screen. secondary: everything else. ghost: low-emphasis toolbar actions.
// danger: destructive and hard to undo (unpublishing is the safe direction, so it is not danger). link: inline text action.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonClassOptions {
  variant: ButtonVariant;
  size: ButtonSize;
  isFullWidth: boolean;
  className?: string;
}

/** Return the button classes for a variant and size, plus any caller class. */
export function buttonClassName({ variant, size, isFullWidth, className }: ButtonClassOptions): string {
  return joinClassNames('ui-button', `ui-button--${variant}`, `ui-button--${size}`, isFullWidth && 'ui-button--full', className);
}
