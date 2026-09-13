/* Step 3 of the offer trace: the scope version the offer answered. For a listing scoped as requirement rows it shows how
   the offer answered each requirement; for an older on-site listing, every stored field it states or leaves unspecified. */
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { Badge, Stack } from '../../../../shared/ui';
import { FactList } from '../../chain/FactList';
import { TraceStep } from '../../chain/TraceStep';
import { RequirementCoverage } from '../../requirements/RequirementCoverage';
import type { OfferTrace } from '../../types';

interface ScopeStepProps {
  scope: OfferTrace['scope_version'];
  answers: OfferTrace['offer']['requirement_responses'];
  currentScopeVersionNumber: number;
}

/** Render the scope version step, saying whether the listing has moved on to a later version. */
export function ScopeStep({ scope, answers, currentScopeVersionNumber }: ScopeStepProps): JSX.Element {
  return (
    <TraceStep
      badges={scope.is_listing_current_version
        ? <Badge tone="neutral">Current scope</Badge>
        : <Badge tone="warning">Earlier version: listing is on v{currentScopeVersionNumber}</Badge>}
      leadsTo="The listing it was published on"
      step={3}
      title={`Scope version ${scope.version_number}`}
    >
      <Stack gap={4}>
        <p className="ui-text-sm ui-text-muted">
          Confirmed {formatTimestamp(scope.created_at)}.{' '}
          {scope.is_listing_current_version
            ? 'This is the listing’s current scope.'
            : `The listing has since moved to version ${currentScopeVersionNumber}; this offer still answers version ${scope.version_number}.`}
        </p>
        <ScopeBody answers={answers} scope={scope} />
      </Stack>
    </TraceStep>
  );
}

function ScopeBody({ scope, answers }: Pick<ScopeStepProps, 'scope' | 'answers'>): JSX.Element {
  if (scope.requirements.length > 0) {
    return <RequirementCoverage answers={answers} requirements={scope.requirements} />;
  }
  return (
    <FactList
      facts={[
        { label: 'Location', value: scope.location_approximate ?? scope.service_area ?? 'location not specified' },
        { label: 'Square footage', value: scope.square_footage ? `${scope.square_footage} sq ft` : 'square footage not specified' },
        { label: 'Visit frequency', value: scope.visit_frequency ?? 'visit frequency not specified' },
        { label: 'Bathrooms', value: scope.bathroom_count !== null ? `${scope.bathroom_count} bathrooms` : 'bathrooms not specified' },
        { label: 'Tasks', value: scope.required_tasks.length ? scope.required_tasks.join(', ') : 'tasks not specified' },
        { label: 'Supplies', value: describeBoolean(scope.supplies_included) },
        { label: 'Equipment', value: describeBoolean(scope.equipment_included) },
        { label: 'Taxes', value: describeBoolean(scope.taxes_included) },
      ]}
    />
  );
}

function describeBoolean(value: boolean | null): string {
  if (value === null) {
    return 'not specified';
  }
  return value ? 'included' : 'not included';
}
