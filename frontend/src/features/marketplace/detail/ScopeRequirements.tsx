/* Lists a public listing's structured scope requirements (the terms offers are scored against) as label/value pairs.
   "Not stated" stays visibly different from "Not included": the owner not answering is information too (plan1.md §4). */
import type { ReactNode } from 'react';

import { Badge } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import './ScopeRequirements.css';

interface ScopeRequirementsProps {
  listing: PublicListingProjection;
}

/** Render the listing's frequency, tasks, supplies/equipment/taxes expectations, area, and any disclosed vendor. */
export function ScopeRequirements({ listing }: ScopeRequirementsProps): JSX.Element {
  return (
    <section aria-labelledby={`scope-${listing.id}`} className="scope-requirements">
      <h2 className="scope-requirements__title" id={`scope-${listing.id}`}>Scope requirements</h2>
      <p className="scope-requirements__summary">{listing.scope_summary}</p>
      <dl className="scope-requirements__list">
        <Requirement isWide label="Tasks">
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
        {/* The incumbent vendor is a separate owner opt-in; the projection only carries it when the owner disclosed it. */}
        {listing.incumbent_vendor_name ? <Requirement label="Current vendor">{listing.incumbent_vendor_name}</Requirement> : null}
      </dl>
    </section>
  );
}

function Requirement({ label, isWide = false, children }: { label: string; isWide?: boolean; children: ReactNode }): JSX.Element {
  return (
    <div className={isWide ? 'scope-requirements__item scope-requirements__item--wide' : 'scope-requirements__item'}>
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
