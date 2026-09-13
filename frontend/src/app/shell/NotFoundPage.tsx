/* Renders the page for a URL that matches no route. */
import { ButtonLink, PageHeader } from '../../shared/ui';

/** Render a defined state for unknown URLs, with its own h1 and a way back into the product. */
export function NotFoundPage(): JSX.Element {
  return (
    <section>
      <PageHeader
        eyebrow="Page not found"
        subtitle="The link may be mistyped, or it pointed at something that no longer exists."
        title="There’s no page at this address"
      />
      <ButtonLink to="/marketplace" variant="primary">Browse markets</ButtonLink>
    </section>
  );
}
