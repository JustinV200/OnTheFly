/* The summary tile that answers "is anything here better than what I pay?": the top-ranked offer's potential savings,
   exactly as the server computed them, marked Provisional with a button to that offer's assumptions. When no offer is
   ranked it says so rather than showing a zero. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { Badge, Button, Card, Stat } from '../../../shared/ui';
import type { InboxChallenge } from '../types';
import { topRankedOffer } from './topRankedOffer';

// The plain server label; any other label ("Potential savings (scope gaps)") qualifies the figure and is shown with it.
const PLAIN_LABEL = 'Potential savings';

interface TopSavingsTileProps {
  offers: InboxChallenge[];
  onOpenOffer: (challengeId: string) => void;
}

/** Render the top-ranked potential savings tile. */
export function TopSavingsTile({ offers, onOpenOffer }: TopSavingsTileProps): JSX.Element {
  const top = topRankedOffer(offers);
  if (!top?.savings) {
    return (
      <Card as="div" className="inbox-summary__tile">
        <Stat
          caption={offers.length === 0 ? 'No offers yet' : 'No offer could be ranked yet'}
          label="Top-ranked potential savings"
          size="xl"
          value={<span className="inbox-summary__none">None yet</span>}
        />
      </Card>
    );
  }

  const { savings } = top;
  return (
    <Card as="div" className="inbox-summary__tile">
      <Stat
        caption={(
          <>
            {savings.is_provisional ? <Badge tone="warning">Provisional</Badge> : null}
            <span>
              {top.challenger_name}
              {savings.label === PLAIN_LABEL ? '' : ` · ${savings.label}`}
              {top.is_current_scope_version ? '' : ` · on scope v${top.answered_scope_version_number}`}
            </span>
            <Button aria-haspopup="dialog" onClick={() => onOpenOffer(top.challenge_id)} size="sm" variant="link">
              See assumptions
            </Button>
          </>
        )}
        label="Top-ranked potential savings"
        size="xl"
        tone={savings.first_year_net_savings_minor > 0 ? 'success' : 'default'}
        unit="first year"
        value={<MoneyDisplay amountMinor={savings.first_year_net_savings_minor} currency={top.baseline_currency} />}
      />
    </Card>
  );
}
