/* Tells a returning challenger that the form below revises their stored offer, before they change anything.
   It sets the mode the current version is recorded under beside the mode a revision will take, since the two can differ. */
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Callout, Card, Stack, Stat } from '../../../shared/ui';
import type { BiddingModeValue, StoredOffer } from '../types';
import './ExistingOfferNotice.css';

interface ExistingOfferNoticeProps {
  offer: StoredOffer;
  // False when this version answered an earlier scope version than the listing has now.
  isOnCurrentScope: boolean;
  // The listing's current mode: the server records a revision under the mode in force when it is made. (A quote
  // captured off-platform stays sealed, but those accounts aren't in the switcher, so this page never acts as one.)
  revisionMode: BiddingModeValue;
}

/** Render the stored offer's price, recorded mode, and anything a revision from this form would change or drop. */
export function ExistingOfferNotice({ offer, isOnCurrentScope, revisionMode }: ExistingOfferNoticeProps): JSX.Element {
  // Anything but an explicit "open" reads as sealed, the same fallback the server applies.
  const recordedMode: BiddingModeValue = offer.bidding_mode_at_submission === 'open' ? 'open' : 'sealed';
  const uneditableTerms = describeUneditableTerms(offer);

  return (
    <Card
      description="Submitting revises it. The form below starts from your current offer. Every term you submit replaces the stored one; earlier versions are kept."
      title="You already have an offer on this listing"
    >
      <Stack gap={4}>
        <div className="existing-offer__summary">
          <Stat
            caption={(
              <>
                <ProvenanceBadge kind="offer" value={offer.provenance} />
                <span>saved {formatTimestamp(offer.revised_at ?? offer.submitted_at)}</span>
              </>
            )}
            label="Your current offer"
            size="lg"
            unit={`/ ${offer.billing_frequency}`}
            value={<MoneyDisplay amountMinor={offer.price_minor} currency={offer.price_currency} />}
          />
          <dl className="existing-offer__modes">
            <div className="existing-offer__mode">
              <dt>Your current version is recorded as</dt>
              <dd><BiddingModePill mode={recordedMode} /></dd>
            </div>
            <div className="existing-offer__mode">
              <dt>This revision will be recorded as</dt>
              <dd><BiddingModePill mode={revisionMode} /></dd>
            </div>
          </dl>
        </div>
        <p className="existing-offer__consequence">
          {revisionMode === 'open'
            ? 'This revision’s price and scope will be visible to other challengers, never your identity.'
            : 'Only the owner will see this revision’s price.'}
        </p>
        {isOnCurrentScope ? null : (
          <Callout role="note" tone="warning">
            <p>
              Your current offer answered an earlier version of this listing’s scope. A revision answers the scope shown below, so check
              that your terms still cover what is requested.
            </p>
          </Callout>
        )}
        {uneditableTerms.length > 0 ? (
          <Callout role="note" tone="warning">
            <p>Your current offer also has terms this form can’t edit ({uneditableTerms.join('; ')}). A revision submitted here won’t keep them.</p>
          </Callout>
        ) : null}
      </Stack>
    </Card>
  );
}

function describeUneditableTerms(offer: StoredOffer): string[] {
  // The form has no inputs for these, so buildChallengePayload sends them empty; saying so beats dropping them silently.
  const terms: string[] = [];
  if (offer.scope_extras.length > 0) {
    terms.push(`extras: ${offer.scope_extras.join(', ')}`);
  }
  if (offer.other_conditions) {
    terms.push(`other conditions: ${offer.other_conditions}`);
  }
  if (offer.offer_expiry) {
    terms.push(`offer expires ${formatTimestamp(offer.offer_expiry)}`);
  }
  return terms;
}
