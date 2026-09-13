/* The open-bidding offer panel body: loading and failure states, then the chart (two or more plotted offers), a single
   offer summary, or an empty state, followed by the notes that keep the chart honest: offers not plotted, offers kept
   sealed, and why the current-price line is missing when the listing isn't billed monthly. */
import type { ApiQueryState } from '../../../../shared/api/useApiQuery';
import { ErrorState } from '../../../../shared/components/ErrorState';
import { Callout, Skeleton, Stack } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import { sealedOfferNote } from '../../leaderboard/sealedOfferNote';
import type { LeaderboardResponse } from '../../types';
import { OfferChart } from '../chart/OfferChart';
import { SingleOffer } from './SingleOffer';
import './OfferActivity.css';

interface OpenOffersProps {
  listing: PublicListingProjection;
  board: ApiQueryState<LeaderboardResponse>;
  // Past the deadline no new offer can arrive, so the empty state mustn't invite one.
  isClosed: boolean;
}

/** Render the open-bidding offer activity for the shared leaderboard query. */
export function OpenOffers({ listing, board, isClosed }: OpenOffersProps): JSX.Element {
  if (!board.data) {
    return board.error ? (
      <ErrorState error={board.error} onRetry={board.reload} title="Offer prices unavailable" />
    ) : (
      <div aria-busy="true" className="open-offers__loading" role="status">
        <span className="ui-text-muted ui-text-sm">Loading offers…</span>
        <Skeleton height="10rem" shape="block" />
      </div>
    );
  }

  const { entries, sealed_offer_count: sealedCount, current_scope_version_number: currentVersion } = board.data;
  // Only ranked offers in the listing's currency share an axis; the server marks the rest with unranked_reason.
  const plotted = entries.filter(
    (entry) => entry.unranked_reason === null && entry.price_currency.toUpperCase() === listing.price_currency.toUpperCase(),
  );
  const notPlottedCount = entries.length - plotted.length;
  // Plotted prices are per month; a price billed on another cadence isn't on that axis, and this page never converts it.
  const isReferenceDrawn = listing.billing_cadence === 'monthly';

  return (
    <Stack gap={4}>
      {board.error ? <ErrorState error={board.error} onRetry={board.reload} title="Showing the last loaded offers; a refresh failed" /> : null}

      {plotted.length >= 2 ? (
        <OfferChart
          currency={listing.price_currency}
          currentScopeVersion={currentVersion}
          entries={plotted}
          referencePriceMinor={isReferenceDrawn ? listing.price_minor : null}
        />
      ) : null}
      {plotted.length === 1 ? <SingleOffer currentScopeVersion={currentVersion} entry={plotted[0]} /> : null}
      {plotted.length === 0 ? (
        <div className="open-offers__empty">
          <p className="open-offers__empty-title">No public offer prices yet</p>
          <p className="ui-text-muted ui-text-sm">
            {isClosed
              ? 'This task closed before any open offer was priced.'
              : 'Open bidding: the first offer sets the price to beat, and it shows up here.'}
          </p>
        </div>
      ) : null}

      {plotted.length >= 2 && !isReferenceDrawn ? (
        <p className="ui-text-muted ui-text-sm">
          The current price is billed {listing.billing_cadence}, so it isn’t drawn: offers are shown per month and this page
          doesn’t convert between periods.
        </p>
      ) : null}
      {notPlottedCount > 0 ? (
        <p className="ui-text-muted ui-text-sm">
          {notPlottedCount === 1 ? '1 offer can’t be ranked against the others, so it isn’t' : `${notPlottedCount} offers can’t be ranked against the others, so they aren’t`}{' '}
          plotted. The Leaderboard tab lists {notPlottedCount === 1 ? 'it' : 'them'} with the reason.
        </p>
      ) : null}
      {sealedCount > 0 ? (
        <Callout role="note" tone="private">
          <p>{sealedOfferNote(sealedCount)}</p>
        </Callout>
      ) : null}
    </Stack>
  );
}
