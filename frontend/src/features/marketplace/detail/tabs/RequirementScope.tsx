/* The Scope tab for a listing scoped as requirement rows (roadmap 12): each requirement with its priority, labor
   category and hours, then the constraints every bidder must meet, then the category template's fields. Offers answer
   each requirement by name, so this is exactly the list the bid form asks about. Public fields only. */
import { Badge, Stack, Table } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import { constraintLabel } from './constraintLabel';
import './RequirementScope.css';

interface RequirementScopeProps {
  listing: PublicListingProjection;
}

/** Render the requirement table, constraints and template fields. */
export function RequirementScope({ listing }: RequirementScopeProps): JSX.Element {
  const requirements = listing.requirements ?? [];
  const constraints = listing.constraints ?? [];
  const fields = listing.scope_fields ?? [];
  const totalHours = requirements.every((row) => row.hours !== null)
    ? requirements.reduce((sum, row) => sum + (row.hours ?? 0), 0)
    : null;

  return (
    <Stack gap={5}>
      <p className="requirement-scope__intro">
        Every offer says, requirement by requirement, what its price includes. Hours are the business’s estimate per
        {` ${listing.billing_cadence}`} period{totalHours !== null ? `, ${totalHours.toLocaleString('en-US')} in total` : ''}.
      </p>
      <Table density="compact" label="Requirements" layout="stack" minWidth="560px">
        <thead>
          <tr>
            <th>Requirement</th>
            <th>Labor category</th>
            <th className="ui-num">Hours</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((row) => (
            <tr key={row.key}>
              <td data-label="Requirement">
                <span className="requirement-scope__text">{row.text}</span>{' '}
                {row.priority === 'should' ? <Badge tone="neutral">Nice to have</Badge> : <Badge tone="info">Must</Badge>}
              </td>
              <td data-label="Labor category">{row.labor_category ?? <span className="requirement-scope__muted">Not stated</span>}</td>
              <td className="ui-num" data-label="Hours">
                {row.hours === null ? <span className="requirement-scope__muted">Not stated</span> : row.hours.toLocaleString('en-US')}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <section aria-labelledby="requirement-scope-constraints">
        <h3 className="requirement-scope__heading" id="requirement-scope-constraints">Every bidder must meet</h3>
        {constraints.length === 0 ? (
          <p className="requirement-scope__muted">No constraints stated.</p>
        ) : (
          <ul className="requirement-scope__constraints">
            {constraints.map((constraint) => (
              <li key={`${constraint.kind}:${constraint.value}`}>
                <Badge size="md" tone="warning">{constraintLabel(constraint.kind)}</Badge> {constraint.value}
              </li>
            ))}
          </ul>
        )}
      </section>

      {fields.length > 0 ? (
        <dl className="requirement-scope__fields">
          {fields.map((field) => (
            <div className="requirement-scope__field" key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </Stack>
  );
}
