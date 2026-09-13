/* The defined page for a listing URL the API won't serve publicly: unpublished by its owner, or a wrong link.
   It has its own h1 so the page reads as intentional, and it never hints at what the private listing contained. */
import { Link } from 'react-router-dom';

import { ButtonLink, Callout, Cluster, Icon, PageHeader, Stack } from '../../../shared/ui';

/** Render the "This listing isn’t public" page with a way back to the markets that are. */
export function ListingNotPublic(): JSX.Element {
  return (
    <Stack gap={5}>
      <PageHeader
        eyebrow={
          <Link className="ui-text-muted" to="/marketplace">
            <Icon name="arrow-left" size={14} /> Markets
          </Link>
        }
        subtitle="Its owner may have unpublished it, or the link is wrong."
        title="This listing isn’t public"
      />
      <Callout role="note" tone="private">
        <p>Offers already made on it stay private with the owner.</p>
      </Callout>
      <Cluster>
        <ButtonLink to="/marketplace" variant="primary">Browse open markets</ButtonLink>
      </Cluster>
    </Stack>
  );
}
