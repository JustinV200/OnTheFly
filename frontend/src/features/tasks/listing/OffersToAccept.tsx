/* The poster's offers on its task, ranked by the server (scope covered first, then monthly price), each with a review-and-
   accept control. Names are shown because only the poster sees this; the full comparison stays on the Offers page. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApiQuery } from '../../../shared/api/useApiQuery';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Badge, Button, ButtonLink, Card, Stack } from '../../../shared/ui';
import type { InboxResponse } from '../../inbox/types';
import { AcceptOfferPanel } from '../acceptance/AcceptOfferPanel';
import './OffersToAccept.css';

// Short, so an offer made by another business shows up soon after switching back.
const POLL_INTERVAL_MS = 5000;

interface OffersToAcceptProps {
  taskId: string;
  listingId: string;
  onAccepted: () => void;
}

/** Render the ranked offers with acceptance controls. */
export function OffersToAccept({ taskId, listingId, onAccepted }: OffersToAcceptProps): JSX.Element {
  const inbox = useApiQuery<InboxResponse>(`/api/listings/${listingId}/inbox`, { pollIntervalMs: POLL_INTERVAL_MS });
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!inbox.data) {
    return inbox.error ? <ErrorState error={inbox.error} onRetry={inbox.reload} title="Couldn’t load offers" /> : <LoadingSpinner label="Loading offers…" />;
  }
  const offers = inbox.data.challenges;
  return (
    <Card
      actions={<ButtonLink size="sm" to={`/listings/${listingId}/inbox`}>Full comparison</ButtonLink>}
      description="Ranked by the server: scope covered first, then monthly price."
      title={offers.length === 1 ? '1 offer' : `${offers.length} offers`}
    >
      {offers.length === 0 ? (
        <p className="ui-text-muted ui-text-sm">No offers yet. They appear here as businesses bid; this list refreshes on its own.</p>
      ) : (
        <ol className="offers-to-accept">
          {offers.map((offer, index) => (
            <li className="offers-to-accept__item" key={offer.challenge_id}>
              <div className="offers-to-accept__row">
                <span className="offers-to-accept__rank">#{index + 1}</span>
                <div className="offers-to-accept__who">
                  <strong>{offer.challenger_name}</strong>
                  <span className="offers-to-accept__badges">
                    <ProvenanceBadge kind="offer" value={offer.provenance} />
                    <Badge tone={offer.scope_completeness >= 1 ? 'success' : 'warning'}>
                      {Math.round(offer.scope_completeness * 100)}% of scope
                    </Badge>
                  </span>
                </div>
                <span className="offers-to-accept__price">
                  <MoneyDisplay amountMinor={offer.normalized_price_minor} currency={offer.price_currency} /> /mo
                </span>
                <Button onClick={() => setReviewingId(reviewingId === offer.challenge_id ? null : offer.challenge_id)} size="sm" variant={reviewingId === offer.challenge_id ? 'ghost' : 'secondary'}>
                  {reviewingId === offer.challenge_id ? 'Close' : 'Accept…'}
                </Button>
              </div>
              {offer.missing_items.length > 0 ? (
                <p className="offers-to-accept__gaps">Not included: {offer.missing_items.map((item) => item.replace(/^requirement:/, '')).join('; ')}</p>
              ) : null}
              {reviewingId === offer.challenge_id ? (
                <Stack gap={2}>
                  <AcceptOfferPanel
                    bidderName={offer.challenger_name}
                    challengeId={offer.challenge_id}
                    onAccepted={() => {
                      setReviewingId(null);
                      onAccepted();
                      navigate(`/tasks/${taskId}`);
                    }}
                    taskId={taskId}
                  />
                </Stack>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
