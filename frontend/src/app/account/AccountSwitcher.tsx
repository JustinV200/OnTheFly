/* The desktop switch band: one visible, named button per seeded business plus the public visitor, so the audience sees
   the whole cast and each switch is one click. Framed as "the other side of the marketplace", not an admin tool
   (roadmap 09, "The account switch as a demo instrument"). The acting identity itself is shown by AccountMenu in the top bar.
   Hidden below 768px, where AccountMenu is the switcher. */
import { CSSProperties, useId } from 'react';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { Icon } from '../../shared/ui';
import { AccountAvatar } from './AccountAvatar';
import { accountOptions, PUBLIC_VISITOR_COLOR } from './accountOptions';
import './account.css';

/** Render the row of switch buttons; the acting one is filled in its business colour, checked, and marked pressed. */
export function AccountSwitcher(): JSX.Element {
  const { account, setAccountId } = useActingAccount();
  const promptId = useId();

  return (
    <section aria-label="Switch acting business" className="account-band">
      <p className="account-band__prompt" id={promptId}>
        Every business can publish and challenge. See it as:
      </p>
      <div aria-labelledby={promptId} className="account-band__options" role="group">
        {accountOptions.map((option) => {
          const isActive = option.id === (account?.id ?? null);
          const style = { '--account-color': option.account?.color ?? PUBLIC_VISITOR_COLOR } as CSSProperties;
          return (
            <button
              aria-pressed={isActive}
              className="account-option"
              key={option.id ?? 'public-visitor'}
              onClick={() => setAccountId(option.id)}
              style={style}
              type="button"
            >
              {/* The acting chip swaps its colour dot for a check, so the marker doesn't widen the row. */}
              {isActive ? <Icon name="check" size={14} /> : <AccountAvatar account={option.account} size="dot" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
