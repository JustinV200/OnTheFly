/* The Spend route for a public visitor: there is no private data to show, so it says why and where to go instead.
   It makes no API request, because a signed-out visitor has no business whose expenses could be loaded. */
import { EmptyState } from '../../shared/components/EmptyState';
import { Badge, ButtonLink, Icon, PageHeader } from '../../shared/ui';

/** Render the signed-out Spend state with its own h1 and the market board as the next step. */
export function SignedOutDashboard(): JSX.Element {
  return (
    <section>
      <PageHeader
        meta={<Badge icon={<Icon name="eye" />} size="md" tone="neutral">Public visitor</Badge>}
        subtitle="Each business’s spend is private to that business."
        title="Spend"
      />
      <EmptyState
        action={<ButtonLink iconEnd={<Icon name="arrow-right" />} to="/marketplace" variant="primary">Browse markets</ButtonLink>}
        title="Pick a business to see its spend"
      >
        <p>
          Choose one from the business switcher in the top bar, or browse the markets. As a public visitor you see only
          what businesses chose to publish, which is exactly what a stranger on the internet sees.
        </p>
      </EmptyState>
    </section>
  );
}
