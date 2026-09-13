/* A round badge in a business's own colour with its initials, or an eye for the public visitor.
   The "dot" size is a plain colour marker for dense rows. Decorative: the business name is always written next to it. */
import type { CSSProperties } from 'react';

import type { DemoAccount } from '../../shared/account/demoAccounts';
import { Icon } from '../../shared/ui';
import { PUBLIC_VISITOR_COLOR } from './accountOptions';
import './AccountAvatar.css';

interface AccountAvatarProps {
  account: DemoAccount | null;
  size: 'dot' | 'sm' | 'md' | 'lg';
}

/** Render the avatar for a business, or for the public visitor when account is null. */
export function AccountAvatar({ account, size }: AccountAvatarProps): JSX.Element {
  // A custom property, not an inline background, so a pressed switch button can invert the avatar from CSS.
  const style = { '--avatar-color': account?.color ?? PUBLIC_VISITOR_COLOR } as CSSProperties;
  return (
    <span aria-hidden="true" className={`account-avatar account-avatar--${size}`} style={style}>
      {size === 'dot' ? null : account ? account.initials : <Icon name="eye" size={size === 'sm' ? 12 : 16} />}
    </span>
  );
}
