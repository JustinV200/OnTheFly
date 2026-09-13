/* One row of the account switcher: the business's avatar and name (or the public visitor with its hint), pressed when it
   is the acting identity. Choosing it is the caller's job, so the row itself holds no switching logic. */
import { forwardRef } from 'react';

import { AccountAvatar } from '../../../shared/account/AccountAvatar';
import { Icon } from '../../../shared/ui';
import type { AccountOption } from '../accountOptions';

interface AccountOptionButtonProps {
  option: AccountOption;
  isActive: boolean;
  onChoose: (option: AccountOption) => void;
}

/** Render a switcher row; the forwarded ref lets the menu move focus to the current choice when it opens. */
export const AccountOptionButton = forwardRef<HTMLButtonElement, AccountOptionButtonProps>(function AccountOptionButton(
  { option, isActive, onChoose },
  ref,
) {
  return (
    <button aria-pressed={isActive} className="account-menu__option" onClick={() => onChoose(option)} ref={ref} type="button">
      <AccountAvatar account={option.account} size="md" />
      <span className="account-menu__option-text">
        {option.label}
        {option.account ? null : <span className="account-menu__option-hint">Sees only what is public</span>}
      </span>
      {isActive ? <Icon name="check" size={18} /> : null}
    </button>
  );
});
