/* Confirms a submitted offer with the terms it was recorded under, as the server stored them.
   The success message states the recorded mode in words; the card below repeats the stored price, provenance, and scope. */
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Button, ButtonLink, Callout, Card, Cluster, Stack, Stat } from '../../../shared/ui';
import type { ChallengeResponse } from '../types';
import './SubmittedOffer.css';

interface SubmittedOfferProps {
  offer: ChallengeResponse;
  onReviseAgain: () => void;
}

/** Render the stored offer: price, the bidding mode this version was recorded under, provenance, time, and scope.
    onReviseAgain reopens the form, which starts from this version's terms. */
export function SubmittedOffer({ offer, onReviseAgain }: SubmittedOfferProps): JSX.Element {
  const article = offer.bidding_mode_at_submission === 'open' ? 'an' : 'a';
  return (
    <Stack gap={4}>
      <Callout role="status" title={offer.revised_at ? 'Offer revised' : 'Offer submitted'} titleLevel={2} tone="success">
        <p>
          Recorded as {article} <strong>{offer.bidding_mode_at_submission}</strong> offer at{' '}
          {formatTimestamp(offer.revised_at ?? offer.submitted_at)}. That mode stays with this version even if the owner changes the
          listing later; a revision is recorded under the terms in force when you make it.
        </p>
      </Callout>

      <Card actions={<BiddingModePill mode={offer.bidding_mode_at_submission} />} title="Your offer as stored">
        <Stack gap={4}>
          <Stat
            caption={<ProvenanceBadge kind="offer" value={offer.provenance} />}
            label="Your price"
            size="lg"
            unit={`/ ${offer.billing_frequency}`}
            value={<MoneyDisplay amountMinor={offer.price_minor} currency={offer.price_currency} />}
          />
          {/* The stored scope, so a revision that dropped terms is visible here and not first in the owner's inbox. */}
          <dl className="submitted-offer__scope">
            <dt>Includes</dt>
            <dd>{offer.scope_included.length > 0 ? offer.scope_included.join(', ') : 'nothing stated'}</dd>
            {offer.scope_excluded.length > 0 ? (
              <>
                <dt>Excludes</dt>
                <dd>{offer.scope_excluded.join(', ')}</dd>
              </>
            ) : null}
          </dl>
          <p className="ui-text-muted">You can revise it until the deadline; earlier versions are kept.</p>
          <Cluster gap={3}>
            <Button onClick={onReviseAgain}>Revise</Button>
            <ButtonLink to={`/listings/${offer.listing_id}`} variant="ghost">Back to the listing</ButtonLink>
          </Cluster>
        </Stack>
      </Card>
    </Stack>
  );
}
