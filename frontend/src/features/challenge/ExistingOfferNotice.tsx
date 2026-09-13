/* Tells a returning challenger that the form below revises their stored offer, before they change anything.
   It sets the mode the current version is recorded under beside the mode a revision will take, since the two can differ. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../shared/provenance/ProvenanceBadge';
import type { BiddingModeValue, StoredOffer } from './types';

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
    <section role="note" style={{ backgroundColor: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: '12px', margin: '1rem 0', padding: '1rem' }}>
      <strong>You already have an offer on this listing, so submitting revises it.</strong>
      <p style={{ margin: '0.5rem 0' }}>
        The form below starts from your current offer: <MoneyDisplay amountMinor={offer.price_minor} currency={offer.price_currency} /> /{' '}
        {offer.billing_frequency}, saved {formatTimestamp(offer.revised_at ?? offer.submitted_at)}. Every term you submit replaces the
        stored one; earlier versions are kept. <ProvenanceBadge kind="offer" value={offer.provenance} />
      </p>
      <p style={{ margin: '0.5rem 0' }}>
        Your current version is recorded as <strong>{recordedMode}</strong>. This revision will be recorded as{' '}
        <strong>{revisionMode}</strong>
        {revisionMode === 'open' ? ': its price and scope will be visible to other challengers, never your identity.' : ': only the owner will see its price.'}
      </p>
      {isOnCurrentScope ? null : (
        <p style={{ margin: '0.5rem 0' }}>
          Your current offer answered an earlier version of this listing’s scope. A revision answers the scope shown below, so check that
          your terms still cover what is requested.
        </p>
      )}
      {uneditableTerms.length > 0 ? (
        <p style={{ margin: '0.5rem 0' }}>
          Your current offer also has terms this form can’t edit ({uneditableTerms.join('; ')}). A revision submitted here won’t keep them.
        </p>
      ) : null}
    </section>
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
