/* Lists a public listing's structured scope requirements (the terms offers are scored against) as a definition list.
   "Not stated" stays visibly different from "Not included": the owner not answering is information too (plan1.md §4). */
import type { ReactNode } from 'react';

import { Badge } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import './ScopeRequirements.css';

interface ScopeRequirementsProps {
  listing: PublicListingProjection;
}

/** Render the listing's summary, tasks, frequency, supplies/equipment/taxes expectations, area, and any disclosed vendor. */
export function ScopeRequirements({ listing }: ScopeRequirementsProps): JSX.Element {
  return (
    <div className="scope-requirements">
      <p className="scope-requirements__intro">
        Offers are scored against these requirements. <em>Not stated</em> means the business didn’t answer, which isn’t
        the same as not included.
      </p>
      <dl className="scope-requirements__list">
        <Requirement label="Summary">{listing.scope_summary || <NotStated />}</Requirement>
        <Requirement label="Tasks">
          {listing.required_tasks.length > 0 ? (
            <ul className="scope-requirements__tasks">
              {listing.required_tasks.map((task) => (
                <li key={task}>
                  <Badge size="md" tone="neutral">{task}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <NotStated text="No tasks listed" />
          )}
        </Requirement>
        <Requirement label="Visit frequency">{listing.visit_frequency ?? <NotStated />}</Requirement>
        <Requirement label="Supplies">{expectationText(listing.supplies_included)}</Requirement>
        <Requirement label="Equipment">{expectationText(listing.equipment_included)}</Requirement>
        <Requirement label="Taxes">{expectationText(listing.taxes_included)}</Requirement>
        <Requirement label="Service area">
          {listing.service_area_approximate ? `${listing.service_area_approximate} (approximate)` : <NotStated />}
        </Requirement>
        <Requirement label="Billed">{listing.billing_cadence}</Requirement>
        {/* The incumbent vendor is a separate owner opt-in; the projection only carries it when the owner disclosed it. */}
        {listing.incumbent_vendor_name ? <Requirement label="Current vendor">{listing.incumbent_vendor_name}</Requirement> : null}
      </dl>
    </div>
  );
}

function Requirement({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="scope-requirements__row">
      <dt className="scope-requirements__label">{label}</dt>
      <dd className="scope-requirements__value">{children}</dd>
    </div>
  );
}

function NotStated({ text = 'Not stated' }: { text?: string }): JSX.Element {
  return <span className="scope-requirements__not-stated">{text}</span>;
}

function expectationText(value: boolean | null): JSX.Element | string {
  if (value === null) {
    return <NotStated />;
  }
  return value ? 'Included' : 'Not included';
}
