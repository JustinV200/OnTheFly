/* The public fields a stranger sees on the listing page but not on the market card: tasks, frequency, included costs,
   deadline, and whether the current vendor is named. Every value comes from the preview projection; nothing from the
   private expense. "Not stated" is shown as such, never left blank. */
import type { ReactNode } from 'react';

import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { Badge } from '../../../shared/ui';
import type { PublicListingProjection } from '../types';
import './ListingPageDetails.css';

interface ListingPageDetailsProps {
  listing: PublicListingProjection;
}

/** Render the listing-page-only fields as label/value rows. */
export function ListingPageDetails({ listing }: ListingPageDetailsProps): JSX.Element {
  return (
    <dl className="publish-page-details">
      <Row label="Tasks">{listing.required_tasks.length > 0 ? listing.required_tasks.join(', ') : <NotStated />}</Row>
      <Row label="How often">{listing.visit_frequency ?? <NotStated />}</Row>
      <Row label="Supplies">{includedText(listing.supplies_included)}</Row>
      <Row label="Equipment">{includedText(listing.equipment_included)}</Row>
      <Row label="Taxes">{includedText(listing.taxes_included)}</Row>
      <Row label="Offers close">{listing.challenge_deadline ? formatTimestamp(listing.challenge_deadline) : 'No deadline'}</Row>
      <Row label="Current vendor">
        {listing.incumbent_vendor_name ? (
          <>
            {listing.incumbent_vendor_name} <Badge tone="warning">Named publicly</Badge>
          </>
        ) : (
          <Badge tone="private">Hidden</Badge>
        )}
      </Row>
    </dl>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="publish-page-details__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function NotStated(): JSX.Element {
  return <Badge tone="neutral">Not stated</Badge>;
}

function includedText(value: boolean | null): ReactNode {
  if (value === null) {
    return <NotStated />;
  }
  return value ? 'Included' : 'Not included';
}
