/* The next step after an offer is stored, so a bidder isn't left on a confirmation with nowhere to go. It says "the
   business that posted this listing" rather than a name: the public listing projection doesn't carry the poster's name,
   and this page reads nothing else. Acceptance moving the task to the bidder is roadmap 12's ownership rule. */
import { ButtonLink, Card, Cluster, Stack } from '../../../../shared/ui';

/** Render the what-happens-next card with links to My work and the markets. */
export function WhatHappensNext(): JSX.Element {
  return (
    <Card title="What happens next">
      <Stack gap={3}>
        <p>
          The business that posted this listing reviews offers. If it accepts yours, the task moves to you and shows up in
          My work.
        </p>
        <Cluster gap={3}>
          <ButtonLink to="/work">Go to My work</ButtonLink>
          <ButtonLink to="/marketplace" variant="ghost">Back to markets</ButtonLink>
        </Cluster>
      </Stack>
    </Card>
  );
}
