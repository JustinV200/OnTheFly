/* Tells a returning challenger that the form below revises their stored offer, before they change anything.
   It sets the mode the current version is recorded under beside the mode a revision will take, since the two can differ,
   and names any stored terms this form can't carry, so a revision never drops them silently. */
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Callout, Card, Icon, Stack, Stat } from '../../../shared/ui';
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

/** Render the stored offer's price, recorded mode beside the revision's mode, and anything a revision would change or drop. */
export function ExistingOfferNotice({ offer, isOnCurrentScope, revisionMode }: ExistingOfferNoticeProps): JSX.Element {
  // Anything but an explicit "open" reads as sealed, the same fallback the server applies.
  const recordedMode: BiddingModeValue = offer.bidding_mode_at_submission === 'open' ? 'open' : 'sealed';
  const uneditableTerms = describeUneditableTerms(offer);

  return (
    <Card description="The form starts from it. Submitting replaces every term; earlier versions are kept." title="Revising your current offer">
      <Stack gap={4}>
        <div className="existing-offer__summary">
          <Stat
            caption={(
              <>
                <ProvenanceBadge kind="offer" value={offer.provenance} />
                <span>saved {formatTimestamp(offer.revised_at ?? offer.submitted_at)}</span>
              </>
            )}
            label="Current offer"
            size="md"
            unit={`/ ${offer.billing_frequency}`}
            value={<MoneyDisplay amountMinor={offer.price_minor} currency={offer.price_currency} />}
          />
          <div className="existing-offer__modes">
            <dl className="existing-offer__mode">
              <dt>Recorded as</dt>
              <dd><BiddingModePill mode={recordedMode} /></dd>
            </dl>
            <Icon className="existing-offer__arrow" name="arrow-right" size={16} />
            <dl className="existing-offer__mode">
              <dt>This revision</dt>
              <dd><BiddingModePill mode={revisionMode} /></dd>
            </dl>
          </div>
        </div>
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
