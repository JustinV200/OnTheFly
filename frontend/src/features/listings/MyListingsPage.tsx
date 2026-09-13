/* My listings: a portfolio of everything the acting business has put up for bids from its expenses, live or unpublished,
   with each listing's price, bidding mode, time left, offers, and actions. New work and split-off pieces have no expense,
   so they live in My work, and one quiet line says so. A public visitor has no listings, so the page says how to pick a
   business instead of making a request. Nothing becomes public from here; Unpublish is one click. */
import { Link } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Badge, ButtonLink, Icon, PageHeader, Stack } from '../../shared/ui';
import { listingStatus } from './card/listingStatus';
import { OwnerListingCard } from './card/OwnerListingCard';
import { ListingsSummary } from './ListingsSummary';
import { OwnerListing, useOwnerListings } from './useOwnerListings';
import './MyListingsPage.css';

/** Render My listings for the acting business, or the public-visitor state. */
export function MyListingsPage(): JSX.Element {
  const { account } = useActingAccount();

  if (!account) {
    return (
      <section>
        <PageHeader
          meta={<Badge icon={<Icon name="eye" />} size="md" tone="neutral">Public visitor</Badge>}
          subtitle="A business’s own listings and the offers they received."
          title="My listings"
        />
        <EmptyState
          action={<ButtonLink iconEnd={<Icon name="arrow-right" />} to="/marketplace" variant="primary">Browse markets</ButtonLink>}
          title="Pick a business to see its listings"
        >
          <p>
            Listings and their offers belong to the business that published them. Choose a business from the switcher in the top bar to
            see its listings. As a public visitor you can browse the markets strangers see.
          </p>
        </EmptyState>
      </section>
    );
  }
  return <OwnerListings businessName={account.businessName} />;
}

function OwnerListings({ businessName }: { businessName: string }): JSX.Element {
  const { expenses, listings, reload, retryListing } = useOwnerListings();

  return (
    <section>
      <PageHeader
        meta={
          <Badge icon={<Icon name="lock" />} size="md" tone="private">
            Only {businessName} can see this page
          </Badge>
        }
        subtitle="What this business has put up for bids, with the offers each one received."
        title="My listings"
      />
      <p className="my-listings__work-note ui-text-sm ui-text-muted">
        New work and pieces you split off are in <Link to="/work">My work</Link>
      </p>
      <OwnerListingsBody expenses={expenses} listings={listings} onRetry={retryListing} onUnpublished={reload} />
    </section>
  );
}

interface OwnerListingsBodyProps {
  expenses: ReturnType<typeof useOwnerListings>['expenses'];
  listings: OwnerListing[];
  onUnpublished: () => void;
  onRetry: (listingId: string) => void;
}

function OwnerListingsBody({ expenses, listings, onUnpublished, onRetry }: OwnerListingsBodyProps): JSX.Element {
  if (!expenses.data) {
    return expenses.error
      ? <ErrorState error={expenses.error} onRetry={expenses.reload} title="Couldn’t load your listings" />
      : <LoadingSpinner label="Loading your listings…" />;
  }
  if (listings.length === 0) {
    return (
      <EmptyState action={<ButtonLink to="/" variant="primary">Go to Spend</ButtonLink>} title="Nothing listed yet">
        <p>REBID or publish an expense from Spend and it shows up here with its offers. Everything stays private until you publish.</p>
      </EmptyState>
    );
  }

  // Live listings first, since they can still take offers; then unpublished ones with their retained offers.
  const ordered = [...listings].sort((first, second) => {
    const liveOrder = Number(listingStatus(second).isPublic) - Number(listingStatus(first).isPublic);
    return liveOrder !== 0 ? liveOrder : first.expense.vendor.localeCompare(second.expense.vendor);
  });

  return (
    <Stack gap={6}>
      <ListingsSummary listings={listings} />
      {expenses.error ? (
        <ErrorState error={expenses.error} onRetry={expenses.reload} title="Showing the last loaded listings; a refresh failed" />
      ) : null}
      <Stack as="ul" className="my-listings__list" gap={4}>
        {ordered.map((listing) => (
          <li key={listing.listingId}>
            <OwnerListingCard listing={listing} onRetry={() => onRetry(listing.listingId)} onUnpublished={onUnpublished} />
          </li>
        ))}
      </Stack>
    </Stack>
  );
}
