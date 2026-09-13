/* Who owns the task, in one line under its title, so a transfer is visible rather than implied:
   client after acceptance: "[GI] GovCon Industries → [PA] Prime A Federal Systems · owns it now";
   owner: "Client: [GI] GovCon Industries · [PA] You own it"; poster that still owns it: "[GI] You posted and own it".
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
        <Icon className="ownership-line__arrow" name="arrow-right" size={14} />
        <span className="ui-visually-hidden">ownership moved to</span>
        {bidder ? <Party party={bidder} /> : <span>the accepted bidder</span>}
        <span className="ownership-line__muted">· owns it now</span>
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
  return (
    <p className="ownership-line">
      {you}
      <span>You posted and own it</span>
      <span className="ownership-line__muted">· no offer accepted yet</span>
    </p>
  );
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
