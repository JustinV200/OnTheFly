/* The publish page's header and its one h1, with the listing's visibility read before any action:
   "Private until you publish" throughout the flow, "Public" plus the bidding mode once it is published. */
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { Badge, Icon, PageHeader } from '../../../shared/ui';
import type { PublicListingProjection } from '../types';

interface PublishHeaderProps {
  // The listing the API confirmed as published; omit while the owner is still deciding.
  publishedListing?: PublicListingProjection;
}

/** Render the page header for the flow, or for the published confirmation. */
export function PublishHeader({ publishedListing }: PublishHeaderProps): JSX.Element {
  if (publishedListing) {
    return (
      <PageHeader
        eyebrow="Put an expense up for bids"
        meta={
          <>
            <Badge icon={<Icon name="globe" />} size="md" tone="success">Public</Badge>
            <BiddingModePill mode={publishedListing.bidding_mode} />
          </>
        }
        subtitle={publishedListing.published_at ? `Published ${formatTimestamp(publishedListing.published_at)}` : undefined}
        title="Published"
      />
    );
  }

  return (
    <PageHeader
      eyebrow="Put an expense up for bids"
      meta={<Badge icon={<Icon name="lock" />} size="md" tone="private">Private until you publish</Badge>}
      subtitle="Confirm the scope, preview exactly what a stranger will see, then publish."
      title="Publish an expense"
    />
  );
}
