/* Gives the states shown before the listing (or the checks behind the form) have loaded the page's h1, so no message
   sits under a missing heading: signed out, unpublished, loading, failed, or the owner's own listing. */
import type { ReactNode } from 'react';

import { PageHeader, Stack } from '../../../shared/ui';

interface BidPageFrameProps {
  children: ReactNode;
}

/** Render a generic "Bid" header above a page state. */
export function BidPageFrame({ children }: BidPageFrameProps): JSX.Element {
  return (
    <Stack gap={6}>
      <PageHeader title="Bid on this listing" />
      {children}
    </Stack>
  );
}
