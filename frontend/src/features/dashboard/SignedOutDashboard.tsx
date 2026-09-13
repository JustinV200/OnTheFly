/* The dashboard route for a public visitor: there is no private data to show, so it says why and where to go instead.
   It makes no API request, because a signed-out visitor has no business whose expenses could be loaded. */
import { Badge, ButtonLink, Icon, PageHeader } from '../../shared/ui';

/** Render the signed-out dashboard state with its own h1 and the marketplace as the next step. */
export function SignedOutDashboard(): JSX.Element {
  return (
    <section>
      <PageHeader
        actions={<ButtonLink to="/marketplace" variant="primary">Browse the marketplace as a visitor</ButtonLink>}
        eyebrow="Private dashboard"
        meta={<Badge icon={<Icon name="eye" />} size="md" tone="neutral">Public visitor</Badge>}
        subtitle={
          <p>
            Pick a business in the bar above to see its private expenses. As a public visitor you see only what businesses have
            chosen to publish, which is exactly what a stranger on the internet sees.
          </p>
        }
        title="Signed out: no private dashboard"
      />
    </section>
  );
}
