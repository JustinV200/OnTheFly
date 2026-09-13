/* "Rehearse on one screen": three links that open the demo guide in new windows, each already acting as one chain
   business (?as=), so a presenter can tile GovCon, Prime A and Sub B side by side. Each window keeps its own acting
   business, so switching in one never changes the others. */
import { buildAccountLink } from '../../../shared/account/accountLink';
import { demoAccounts } from '../../../shared/account/demoAccounts';
import { ButtonLink, Icon } from '../../../shared/ui';
import { GOVCON_ID, PRIME_A_ID, SUB_B_ID } from '../progress/chainTasks';
import { ActorDot } from './ActorDot';
import './RehearseLinks.css';

const REHEARSAL_ACCOUNT_IDS = [GOVCON_ID, PRIME_A_ID, SUB_B_ID];

/** Render the rehearsal row. */
export function RehearseLinks(): JSX.Element {
  return (
    <div className="demo-rehearse">
      <p className="demo-rehearse__label">Rehearse on one screen</p>
      <ul className="demo-rehearse__links">
        {REHEARSAL_ACCOUNT_IDS.map((accountId) => {
          const account = demoAccounts.find((candidate) => candidate.id === accountId);
          const name = account?.businessName ?? accountId;
          return (
            <li key={accountId}>
              {/* A new window, not this tab: the point is three windows, each acting as its own business. */}
              <ButtonLink iconEnd={<Icon name="external-link" size={14} />} rel="noopener noreferrer" size="sm" target="_blank" to={buildAccountLink('/demo', accountId)} variant="secondary">
                <ActorDot color={account?.color ?? null} /> {name}
                <span className="ui-visually-hidden"> (opens a new window acting as {name})</span>
              </ButtonLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
