/* One listing in My listings, read like a position in a portfolio: its title (the task's, else the category) and vendor,
   the price the business published as the big number, then visibility, bidding mode, offers, and time left, and the
   owner's actions. Owner-only: the vendor name is private and appears here because only the acting business sees this page. */
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { ErrorState } from '../../../shared/components/ErrorState';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../../shared/format/categoryLabel';
import { cadenceSuffix, CategoryTile, describeClosesIn } from '../../../shared/market';
import { Badge, Icon, Skeleton } from '../../../shared/ui';
import { VisibilityBadge } from '../../dashboard/visibility/VisibilityBadge';
import type { OwnerListing } from '../useOwnerListings';
import { ListingStatus, listingStatus } from './listingStatus';
import { OwnerListingActions } from './OwnerListingActions';
import './OwnerListingCard.css';

interface OwnerListingCardProps {
  listing: OwnerListing;
  onUnpublished: () => void;
  onRetry: () => void;
}

/** Render one listing card; its facts show a placeholder until the listing's inbox loads. */
export function OwnerListingCard({ listing, onUnpublished, onRetry }: OwnerListingCardProps): JSX.Element {
  const { expense, inbox } = listing;
  const status = listingStatus(listing);
  const { record } = status;
  const category = record?.category ?? expense.category;
  const area = record?.service_area_approximate;
  // A titled listing names its category under the title instead, so the category is never lost.
  const title = record?.title?.trim() || null;
  const subtitle = [title ? categoryLabel(category) : null, expense.vendor, area || null].filter(Boolean).join(' · ');

  return (
    <article className="owner-listing">
      <header className="owner-listing__heading">
        <CategoryTile category={category} />
        <div className="owner-listing__names">
          <h2 className="owner-listing__title">{title ?? categoryLabel(category)}</h2>
          <p className="owner-listing__subtitle">{subtitle}</p>
        </div>
      </header>

      <div className="owner-listing__price">
        {record ? (
          <>
            <span className="owner-listing__amount">
              <MoneyDisplay amountMinor={record.price_minor} currency={record.price_currency} />
              <span className="owner-listing__period">{cadenceSuffix(record.billing_cadence)}</span>
            </span>
            <span className="owner-listing__caption">{priceCaption(status)}</span>
          </>
        ) : inbox.phase === 'loading' ? (
          <span role="status">
            <span className="ui-visually-hidden">Loading this listing’s price and offers…</span>
            <Skeleton height="1.75rem" width="9rem" />
          </span>
        ) : null}
      </div>

      <div className="owner-listing__status">
        <StatusBadges expenseVisibility={expense.visibility} status={status} />
      </div>

      {inbox.phase === 'failed' ? (
        <div className="owner-listing__failure">
          <ErrorState error={inbox.error} onRetry={onRetry} title="Couldn’t load this listing’s price and offers" />
        </div>
      ) : null}

      <OwnerListingActions listing={listing} onUnpublished={onUnpublished} status={status} />
    </article>
  );
}

function StatusBadges({ status, expenseVisibility }: { status: ListingStatus; expenseVisibility: string }): JSX.Element {
  const { isPublic, record, offerCount, isDraft } = status;

  if (!isPublic) {
    if (isDraft || offerCount === null) {
      return <VisibilityBadge size="sm" visibility={record?.visibility ?? expenseVisibility} />;
    }
    return (
      <Badge icon={<Icon name="lock" />} title="Unpublished: nobody else can see it. Offers received while public are kept." tone="private">
        Private · {offerCount} {offerCount === 1 ? 'offer' : 'offers'} retained
      </Badge>
    );
  }

  const closes = record ? describeClosesIn(record.challenge_deadline) : null;
  return (
    <>
      <VisibilityBadge size="sm" visibility="public" />
      {record ? <BiddingModePill mode={record.bidding_mode} /> : null}
      {offerCount !== null ? (
        <Badge icon={<Icon name="users" />} tone="neutral">{offerCount === 1 ? '1 offer' : `${offerCount} offers`}</Badge>
      ) : null}
      {closes ? (
        <Badge icon={<Icon name="clock" />} title={closes.exact ?? undefined} tone={closes.isClosed ? 'danger' : 'neutral'}>
          {closes.label}
        </Badge>
      ) : null}
    </>
  );
}

// Words under the price, so a private listing's figure never reads as a price strangers can see now.
function priceCaption({ isPublic, isDraft }: ListingStatus): string {
  if (isPublic) {
    return 'Current price';
  }
  return isDraft ? 'Current price in the draft, not published' : 'Current price when it was public';
}
