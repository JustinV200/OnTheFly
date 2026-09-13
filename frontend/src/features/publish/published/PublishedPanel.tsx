/* Confirms a publish and sets up the privacy proof: open the public profile as a stranger would.
   It also shows what went out (the API's published projection) and keeps unpublish one click away. */
import { Link } from 'react-router-dom';

import type { DemoAccount } from '../../../shared/account/demoAccounts';
import { ButtonLink, Callout, Card, Cluster, Grid, Stack } from '../../../shared/ui';
import { PayloadJson } from '../preview/PayloadJson';
import { PublicListingSummary } from '../preview/PublicListingSummary';
import type { ListingPreviewResponse } from '../types';
import { UnpublishButton } from '../UnpublishButton';
import { CopyLinkButton } from './CopyLinkButton';
import './PublishedPanel.css';

interface PublishedPanelProps {
  account: DemoAccount;
  published: ListingPreviewResponse;
  onUnpublished: () => void;
}

/** Render the published confirmation with links to the public views, the published payload, and an instant unpublish. */
export function PublishedPanel({ account, published, onUnpublished }: PublishedPanelProps): JSX.Element {
  const listing = published.projection;
  const profileUrl = `${window.location.origin}/p/${account.handle}`;

  return (
    <Stack gap={6}>
      <Callout role="status" title="This one listing is now public" titleLevel={2} tone="success">
        <p>
          Every other expense stays private. To see what a stranger sees, open the public profile in a private or logged-out window:
        </p>
        <Cluster gap={3}>
          <code className="published-panel__url">{profileUrl}</code>
          <CopyLinkButton url={profileUrl} />
        </Cluster>
      </Callout>

      <Grid gap={6} minItemWidth="320px">
        <Card title="See it as others do">
          <Stack gap={4}>
            <Cluster gap={3}>
              <ButtonLink to={`/p/${account.handle}`} variant="primary">Open public profile</ButtonLink>
              <ButtonLink to={`/listings/${listing.id}`}>View listing as challengers see it</ButtonLink>
            </Cluster>
            <Link to={`/listings/${listing.id}/inbox`}>Offers inbox</Link>
          </Stack>
        </Card>
        <Card description="Takes this listing off your public profile and the marketplace immediately. Offers it already received are kept." title="Unpublish">
          <UnpublishButton listingId={listing.id} onUnpublished={onUnpublished} />
        </Card>
      </Grid>

      <Card title="What is public now">
        <Grid gap={6} minItemWidth="340px">
          <PublicListingSummary listing={listing} />
          <PayloadJson listing={listing} mode="published" payloadHash={published.payload_hash} />
        </Grid>
      </Card>
    </Stack>
  );
}
