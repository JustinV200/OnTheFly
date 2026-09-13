/* After publishing: share the listing, see it as a stranger, invite suppliers, or take it down in one click.
   What went out is shown from the API's published response (the card and the served payload), never from the form. */
import { MarketCard } from '../../../shared/market';
import { ButtonLink, Callout, Card, Cluster, CopyButton, Disclosure, Icon, Stack } from '../../../shared/ui';
import { PayloadJson } from '../preview/PayloadJson';
import type { ListingPreviewResponse } from '../types';
import { UnpublishButton } from '../UnpublishButton';
import './PublishedScreen.css';

interface PublishedScreenProps {
  vendorName: string;
  profileHandle: string;
  published: ListingPreviewResponse;
  onUnpublished: () => void;
}

/** Render the success message, the share and view actions, the always-visible unpublish, and what is public now. */
export function PublishedScreen({ vendorName, profileHandle, published, onUnpublished }: PublishedScreenProps): JSX.Element {
  const listing = published.projection;
  const listingPath = `/listings/${listing.id}`;
  const listingUrl = `${window.location.origin}${listingPath}`;

  return (
    <Stack gap={6}>
      <Callout role="status" title={`${vendorName} is now up for bids`} titleLevel={2} tone="success">
        <p>This one listing is public. Every other expense stays private.</p>
      </Callout>

      <div className="published-screen__grid">
        <Card title="Share it">
          <Stack gap={4}>
            <code className="published-screen__url">{listingUrl}</code>
            <Cluster gap={2}>
              <CopyButton label="Copy share link" value={listingUrl} variant="primary" />
              <ButtonLink iconEnd={<Icon name="external-link" size={15} />} rel="noopener" target="_blank" to={listingPath}>
                View as a stranger
              </ButtonLink>
              <ButtonLink iconStart={<Icon name="mail" size={15} />} to={`${listingPath}/invite`}>Invite suppliers</ButtonLink>
            </Cluster>
            <p className="ui-text-sm ui-text-muted">
              The listing page shows only the public payload. For the full stranger’s view, open the link in a private window or switch to
              Public visitor.
            </p>
            <Cluster gap={4}>
              <ButtonLink size="sm" to={`${listingPath}/inbox`} variant="link">Offers</ButtonLink>
              <ButtonLink size="sm" to={`/p/${profileHandle}`} variant="link">Your public profile</ButtonLink>
            </Cluster>
          </Stack>
        </Card>

        <Card description="Takes it off the market board and your public profile immediately. Offers already received are kept." title="Changed your mind?">
          <UnpublishButton listingId={listing.id} onUnpublished={onUnpublished} />
        </Card>
      </div>

      <Card title="What is public now">
        <Stack gap={5}>
          <div className="published-screen__card">
            <MarketCard listing={listing} offerCount={null} />
          </div>
          <Disclosure summary="Show the payload the public API serves" variant="card">
            <PayloadJson listing={listing} mode="published" payloadHash={published.payload_hash} />
          </Disclosure>
        </Stack>
      </Card>
    </Stack>
  );
}
