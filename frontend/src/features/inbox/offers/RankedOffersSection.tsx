/* The ranked list's section: a heading with the ranking rule in one line, the full rule behind "How ranking works",
   a visible failure if the baseline figure couldn't load, then the table. */
import type { ApiError } from '../../../shared/api/client';
import { ErrorState } from '../../../shared/components/ErrorState';
import { Disclosure } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import type { ComparisonRow, InboxChallenge } from '../types';
import { RankedOffersTable } from './RankedOffersTable';

interface RankedOffersSectionProps {
  listing: PublicListingProjection;
  offers: InboxChallenge[];
  currentScopeVersionNumber: number;
  incumbent: ComparisonRow | null;
  // Set only when the comparison has never loaded; a failed poll behind loaded data keeps the last figure.
  comparisonError: ApiError | null;
  onOpenOffer: (challengeId: string) => void;
  onRetry: () => void;
}

/** Render the heading, ranking rule, and ranked table. */
export function RankedOffersSection({ listing, offers, currentScopeVersionNumber, incumbent, comparisonError, onOpenOffer, onRetry }: RankedOffersSectionProps): JSX.Element {
  return (
    <section aria-labelledby="ranked-offers-heading" className="ranked-offers-section">
      <div className="ranked-offers-section__head">
        <h2 className="ranked-offers-section__title" id="ranked-offers-heading">Offers, ranked</h2>
        <p className="ranked-offers-section__rule">
          Most scope covered first, then lowest monthly price. Savings are potential until you switch. New offers appear automatically.
        </p>
        <Disclosure summary="How ranking works">
          <p>
            Every price is restated per month by the server. An offer that covers less of your scope ranks below one that covers more,
            even when it is cheaper, because it isn’t the same work. Offers made on an earlier version of your scope are ranked
            separately, each scored against the scope and price it answered. An offer in another currency can’t be compared and is
            listed last, unranked. Savings are provisional while costs such as setup or switching fees are unknown.
          </p>
        </Disclosure>
      </div>
      {comparisonError ? (
        <ErrorState error={comparisonError} onRetry={onRetry} title="Couldn’t load the monthly figure for what you pay now" />
      ) : null}
      <RankedOffersTable
        currentScopeVersionNumber={currentScopeVersionNumber}
        incumbent={incumbent}
        isIncumbentFailed={comparisonError !== null}
        listing={listing}
        offers={offers}
        onOpenOffer={onOpenOffer}
      />
    </section>
  );
}
