/* Who owns the task, in one line under its title, so a transfer is visible rather than implied:
   client after acceptance: "[GI] GovCon Industries → ownership moved to [PA] Prime A Federal Systems";
   owner: "Client: [GI] GovCon Industries · [PA] You own it". A poster that still owns its task gets no line: there is no
   counterparty yet, and the header's "You posted and own this" badge already says so.
   Names come only from what the API returned (buyer_money.accepted_bidder, owner_money.client) plus the acting business
   itself; nothing two steps away is ever named here. */
import { Link } from 'react-router-dom';

import { AccountAvatar } from '../../../shared/account/AccountAvatar';
import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { demoAccounts } from '../../../shared/account/demoAccounts';
import { Icon } from '../../../shared/ui';
import type { Counterparty, TaskDetail } from '../types';
import './OwnershipLine.css';

/** Render the ownership line for the acting business's relationship to the task. */
export function OwnershipLine({ task }: { task: TaskDetail }): JSX.Element | null {
  const { account } = useActingAccount();
  const you = <AccountAvatar account={account} size="sm" />;

  if (task.relationship === 'poster') {
    const bidder = task.buyer_money?.accepted_bidder ?? null;
    return (
      <p className="ownership-line">
        {you}
        <span>{account?.businessName ?? 'You'}</span>
        <Icon className="ownership-line__arrow" name="arrow-right" size={16} />
        {/* The transfer is the whole point of the page, so the connecting words are visible, not just an arrow. */}
        <strong className="ownership-line__moved">ownership moved to</strong>
        {bidder ? <Party party={bidder} /> : <span>the accepted bidder</span>}
      </p>
    );
  }
  if (task.relationship === 'owner') {
    const client = task.owner_money?.client ?? null;
    return (
      <p className="ownership-line">
        {client ? (
          <>
            <span className="ownership-line__muted">Client:</span>
            <Party party={client} />
            <span className="ownership-line__muted">·</span>
          </>
        ) : null}
        {you}
        <strong>You own it</strong>
      </p>
    );
  }
  return null;
}

function Party({ party }: { party: Counterparty }): JSX.Element {
  // Seeded businesses get their colour; any other falls back to its name alone, never a made-up avatar.
  const known = demoAccounts.find((candidate) => candidate.handle === party.handle) ?? null;
  return (
    <>
      {known ? <AccountAvatar account={known} size="sm" /> : null}
      <Link to={`/p/${party.handle}`}>{party.business_name}</Link>
    </>
  );
}
