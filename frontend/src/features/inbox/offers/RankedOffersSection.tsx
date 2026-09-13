/* The ranked list's section: a heading, the screen's single savings caveat, the ranking rule behind "How ranking
   works", a visible failure if the baseline figure couldn't load, then the table. The caveat is stated once here and
   nowhere else on this screen; the per-row Provisional badges stay. */
import type { ApiError } from '../../../shared/api/client';
import { ErrorState } from '../../../shared/components/ErrorState';
import { Disclosure } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import type { ComparisonRow, InboxChallenge, OwnerChallenge } from '../types';
import { RankedOffersTable } from './RankedOffersTable';

interface RankedOffersSectionProps {
  listing: PublicListingProjection;
  offers: InboxChallenge[];
  // Every offer's terms as submitted, for prices in their own billing period; empty while they load.
  offerTerms: OwnerChallenge[];
  currentScopeVersionNumber: number;
  incumbent: ComparisonRow | null;
  // Set only when the comparison has never loaded; a failed poll behind loaded data keeps the last figure.
  comparisonError: ApiError | null;
  onOpenOffer: (challengeId: string) => void;
  onRetry: () => void;
}

/** Render the heading, the savings caveat, the ranking rule, and the ranked table. */
export function RankedOffersSection({ listing, offers, offerTerms, currentScopeVersionNumber, incumbent, comparisonError, onOpenOffer, onRetry }: RankedOffersSectionProps): JSX.Element {
  return (
    <section aria-labelledby="ranked-offers-heading" className="ranked-offers-section">
      <div className="ranked-offers-section__head">
        <h2 className="ranked-offers-section__title" id="ranked-offers-heading">Offers, ranked</h2>
        {/* The screen's one savings caveat. The rows keep their Provisional badges; no other prose repeats this. */}
        <p className="ranked-offers-section__rule">
          Savings are potential until you switch. New offers appear automatically.
        </p>
        <Disclosure summary="How ranking works">
          <p>
            Ranked by scope covered first, then by price compared per month. A cheaper offer that covers less scope never ranks
            above one that covers more.
          </p>
        </Disclosure>
      </div>
      {comparisonError ? (
        <ErrorState error={comparisonError} onRetry={onRetry} title="Couldn’t load the comparison for what you pay now" />
      ) : null}
      <RankedOffersTable
        currentScopeVersionNumber={currentScopeVersionNumber}
        incumbent={incumbent}
        isIncumbentFailed={comparisonError !== null}
        listing={listing}
        offerTerms={offerTerms}
        offers={offers}
        onOpenOffer={onOpenOffer}
      />
    </section>
  );
}
