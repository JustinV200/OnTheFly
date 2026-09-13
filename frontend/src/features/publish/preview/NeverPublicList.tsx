/* The standing list of what a listing never discloses, shown beside every preview (CLAUDE.md, "Never public"). */
import { Callout } from '../../../shared/ui';

const NEVER_PUBLIC = [
  'Raw transaction history',
  'Account and connection details',
  'Your other expenses, public or private',
  'Who has challenged you (challenger identities)',
  'Offer prices, unless you choose open bidding',
  'Exact street address',
];

/** Render the "Never public" list as a private-toned note. */
export function NeverPublicList(): JSX.Element {
  return (
    <Callout role="note" title="Never public" tone="private">
      <ul>
        {NEVER_PUBLIC.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </Callout>
  );
}
