/* The poster's offers on its task, in the server's ranking (scope covered first, then price compared per month), each
   shown at the price its bidder submitted and with an "Accept…" control that opens the acceptance check directly.
   The top-ranked offer's Accept is the card's primary action; the Offers page (evidence, savings, revisions) is a quiet
   link. Names are shown because only the poster sees this. */
import { useRef, useState } from 'react';

import { useApiQuery } from '../../../shared/api/useApiQuery';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Badge, Button, ButtonLink, Card, useFocusOnRequest } from '../../../shared/ui';
import { FlyOpinionBubble } from '../../brainview';
import type { InboxResponse, OwnerChallengeListResponse } from '../../inbox/types';
import { AcceptOfferPanel } from '../acceptance/AcceptOfferPanel';
import { OfferPrice } from './OfferPrice';
import './OffersToAccept.css';

// Short, so an offer made by another business shows up soon after switching back.
const POLL_INTERVAL_MS = 5000;

interface OffersToAcceptProps {
  taskId: string;
  listingId: string;
  // Called with the accepted bidder's name once the server confirms the transfer.
  onAccepted: (bidderName: string) => void;
  // Set by the next-step "Review offers": scroll to and focus this list once it loads, then clear it.
  isFocusRequested: boolean;
  onFocusHandled: () => void;
}

/** Render the ranked offers with acceptance controls. */
export function OffersToAccept({ taskId, listingId, onAccepted, isFocusRequested, onFocusHandled }: OffersToAcceptProps): JSX.Element {
  const inbox = useApiQuery<InboxResponse>(`/api/listings/${listingId}/inbox`, { pollIntervalMs: POLL_INTERVAL_MS });
  // The ranked inbox carries only monthly-normalized prices; the owner's offers endpoint has each submitted price and period.
  const submitted = useApiQuery<OwnerChallengeListResponse>(`/api/listings/${listingId}/challenges`, { pollIntervalMs: POLL_INTERVAL_MS });
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  useFocusOnRequest(regionRef, isFocusRequested, inbox.data !== null, onFocusHandled);

  const submittedById = new Map((submitted.data?.challenges ?? []).map((challenge) => [challenge.id, challenge]));
  const offers = inbox.data?.challenges ?? [];

  return (
    <div className="offers-to-accept__region" ref={regionRef} tabIndex={-1}>
      {!inbox.data ? (
        inbox.error ? <ErrorState error={inbox.error} onRetry={inbox.reload} title="Couldn’t load offers" /> : <LoadingSpinner label="Loading offers…" />
      ) : (
        <Card
          actions={<ButtonLink size="sm" to={`/listings/${listingId}/inbox`} variant="ghost">Compare all offers</ButtonLink>}
          description="Ranked by scope covered first, then by price. Each price shows as its bidder submitted it."
          title={offers.length === 1 ? '1 offer' : `${offers.length} offers`}
        >
          {offers.length === 0 ? (
            <p className="ui-text-muted ui-text-sm">No offers yet. They appear here as businesses bid; this list refreshes on its own.</p>
          ) : (
            <ol className="offers-to-accept">
              {offers.map((offer, index) => {
                const isReviewing = reviewingId === offer.challenge_id;
                return (
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
                      <OfferPrice offer={offer} submitted={submittedById.get(offer.challenge_id)} />
                      <Button
                        onClick={() => setReviewingId(isReviewing ? null : offer.challenge_id)}
                        size="sm"
                        variant={isReviewing ? 'ghost' : index === 0 ? 'primary' : 'secondary'}
                      >
                        {isReviewing ? 'Close' : 'Accept…'}
                      </Button>
                    </div>
                    {offer.missing_items.length > 0 ? (
                      <p className="offers-to-accept__gaps">Not included: {offer.missing_items.map((item) => item.replace(/^requirement:/, '')).join('; ')}</p>
                    ) : null}
                    {/* A toy beside the decision, never part of it: the accept check below is the server's alone. */}
                    <FlyOpinionBubble bidderName={offer.challenger_name} stimulus={offer.fly_opinion_stimulus} />
                    {isReviewing ? (
                      <AcceptOfferPanel
                        bidderName={offer.challenger_name}
                        challengeId={offer.challenge_id}
                        isReviewedOnOpen
                        onAccepted={() => {
                          setReviewingId(null);
                          onAccepted(offer.challenger_name);
                        }}
                        onCancel={() => setReviewingId(null)}
                        taskId={taskId}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      )}
    </div>
  );
}
