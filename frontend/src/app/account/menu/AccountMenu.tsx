/* The acting identity in the top bar, and the switcher behind it. Visible on every screen at every width, so who is acting
   is never scrolled away. The name stays at least 18px on desktop for projector legibility (roadmap 09, "The account
   switch as a demo instrument"). One tap switches business, or to the public visitor, who is listed apart at the bottom.
   Businesses are grouped: the task chain's three first, under their own heading, then the rest.
   The panel also links to the business's public profile and holds the full theme choice, including Match system. */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { AccountAvatar } from '../../../shared/account/AccountAvatar';
import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { ThemeToggle } from '../../../shared/theme';
import { Icon } from '../../../shared/ui';
import { AccountOption, accountGroups, publicVisitorOption } from '../accountOptions';
import { AccountOptionButton } from './AccountOptionButton';
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
  const headingIdPrefix = useId();

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

  const choose = (option: AccountOption): void => {
    setAccountId(option.id);
    close(true);
  };
  const isActive = (option: AccountOption): boolean => option.id === (account?.id ?? null);

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
            {account ? 'Acting as' : (
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
          {accountGroups.map((group, index) => {
            const headingId = `${headingIdPrefix}-group-${index}`;
            return (
              <div className="account-menu__group" key={group.heading}>
                <p className="account-menu__group-heading" id={headingId}>{group.heading}</p>
                <ul aria-labelledby={headingId} className="account-menu__list">
                  {group.options.map((option) => (
                    <li key={option.id ?? 'public-visitor'}>
                      <AccountOptionButton isActive={isActive(option)} onChoose={choose} option={option} ref={isActive(option) ? activeOptionRef : undefined} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {/* The visitor row stands apart: it is the logged-out view, not another business. */}
          <div className="account-menu__visitor">
            <AccountOptionButton
              isActive={isActive(publicVisitorOption)}
              onChoose={choose}
              option={publicVisitorOption}
              ref={isActive(publicVisitorOption) ? activeOptionRef : undefined}
            />
          </div>
          <div className="account-menu__footer">
            {account ? (
              <Link className="account-menu__profile-link" onClick={() => close(false)} to={`/p/${account.handle}`}>
                <Icon name="globe" size={16} />
                View our public profile
              </Link>
            ) : null}
            <div className="account-menu__theme">
              <span>Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
