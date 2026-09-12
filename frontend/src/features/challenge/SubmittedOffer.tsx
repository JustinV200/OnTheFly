/* Confirms a submitted offer with the terms it was recorded under, as the server stored them. */
import { Link } from 'react-router-dom';

import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../shared/provenance/ProvenanceBadge';
import type { ChallengeResponse } from './types';

interface SubmittedOfferProps {
  offer: ChallengeResponse;
  onReviseAgain: () => void;
}

/** Render the stored offer: price, bidding mode at submission, provenance, and time. */
export function SubmittedOffer({ offer, onReviseAgain }: SubmittedOfferProps): JSX.Element {
  return (
    <section role="status" style={{ backgroundColor: '#ecfdf5', border: '2px solid #047857', borderRadius: '12px', padding: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>{offer.revised_at ? 'Offer revised' : 'Offer submitted'}</h2>
      <p style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>
        <MoneyDisplay amountMinor={offer.price_minor} currency={offer.price_currency} /> / {offer.billing_frequency}
      </p>
      <p style={{ margin: '0 0 0.5rem' }}>
        Recorded as a <strong>{offer.bidding_mode_at_submission}</strong> offer at{' '}
        {formatTimestamp(offer.revised_at ?? offer.submitted_at)}. That mode stays with this offer even if the owner changes the
        listing later. <ProvenanceBadge kind="offer" value={offer.provenance} />
      </p>
      <p style={{ margin: 0 }}>
        You can revise it until the deadline; earlier versions are kept.{' '}
        <button onClick={onReviseAgain} type="button">Revise</button>{' '}
        <Link to={`/listings/${offer.listing_id}`}>Back to the listing</Link>
      </p>
    </section>
  );
}
