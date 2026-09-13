/* The acting identity in the top bar, and the switcher behind it. Visible on every screen at every width, so who is acting
   is never scrolled away. The name is large on desktop for projector legibility; on a phone it opens a list where one tap
   switches business (or to the public visitor) and closes the list. */
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { Icon } from '../../../shared/ui';
import { AccountAvatar } from '../AccountAvatar';
import { accountOptions } from '../accountOptions';
import { useMenuDismiss } from './useMenuDismiss';
import './AccountMenu.css';

/** Render the identity trigger and, while open, the switch list. */
export function AccountMenu(): JSX.Element {
  const { account, setAccountId } = useActingAccount();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeOptionRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback((returnFocus: boolean): void => {
    setIsOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);
  useMenuDismiss(rootRef, isOpen, close);

  // Opening moves focus to the current choice, so a keyboard user starts where they are.
  useEffect(() => {
    if (isOpen) {
      activeOptionRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="account-menu__trigger"
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <AccountAvatar account={account} size="md" />
        <span className="account-menu__identity">
          <span className="account-menu__eyebrow">
            {account ? 'You are acting as' : (
              <>Signed out<span className="account-menu__eyebrow-detail">: sees only what is public</span></>
            )}
          </span>
          <span className="account-menu__name">{account ? account.businessName : 'Public visitor'}</span>
        </span>
        <span className="ui-visually-hidden">. Switch business</span>
        <Icon className="account-menu__chevron" name="chevron-down" size={18} />
      </button>

      {isOpen ? (
        <div className="account-menu__panel" id={panelId}>
          <p className="account-menu__prompt">Every business can publish and challenge. See it as:</p>
          <ul className="account-menu__list">
            {accountOptions.map((option) => {
              const isActive = option.id === (account?.id ?? null);
              return (
                <li key={option.id ?? 'public-visitor'}>
                  <button
                    aria-pressed={isActive}
                    className="account-menu__option"
                    onClick={() => {
                      setAccountId(option.id);
                      close(true);
                    }}
                    ref={isActive ? activeOptionRef : undefined}
                    type="button"
                  >
                    <AccountAvatar account={option.account} size="md" />
                    <span className="account-menu__option-text">
                      {option.label}
                      {option.account ? null : <span className="account-menu__option-hint">Sees only what is public</span>}
                    </span>
                    {isActive ? <Icon name="check" size={18} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
