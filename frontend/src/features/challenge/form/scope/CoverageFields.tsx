/* The "What's covered" section: which of the owner's requested scope the price covers, one row per requested term.
   "Match everything requested" sits at the top as an explicit choice, never a default. Blank and "Not stated" stay
   distinct from "Not included", so an offer is never scored on an answer nobody gave. */
import { Button, Card, Checkbox, Cluster, Disclosure, Field, Grid, Input, Stack } from '../../../../shared/ui';
import type { PublicListingProjection } from '../../../publish/types';
import type { ChallengeFormFields } from '../../buildChallengePayload';
import { IncludedRow } from './IncludedRow';
import './CoverageFields.css';

interface CoverageFieldsProps {
  fields: ChallengeFormFields;
  listing: PublicListingProjection;
  // The task checkboxes to show: the listing's required tasks, or the template's when it names none.
  taskChoices: string[];
  isTemplateTasks: boolean;
  onChange: (patch: Partial<ChallengeFormFields>) => void;
  onMatchRequestedScope: () => void;
}

/** Render the requested scope line, the match shortcut, task checkboxes, visits, the three included terms, and free-text extras. */
export function CoverageFields({ fields, listing, taskChoices, isTemplateTasks, onChange, onMatchRequestedScope }: CoverageFieldsProps): JSX.Element {
  const toggleTask = (task: string, isChecked: boolean): void => {
    onChange({ tasks: isChecked ? [...fields.tasks, task] : fields.tasks.filter((item) => item !== task) });
  };
  // A revision can carry typed extras; keep them in view rather than folded away where they'd be missed.
  const hasExtras = fields.otherInclusions.trim() !== '' || fields.exclusions.trim() !== '';

  return (
    <Card description={<>Requested: {listing.scope_summary}</>} title="What’s covered">
      <Stack gap={5}>
        <div className="bid-coverage__match">
          <Button onClick={onMatchRequestedScope} size="sm" variant="secondary">Match everything requested</Button>
          <span className="ui-text-sm ui-text-muted">Sets every answer below to exactly what the owner asked for. Check it before submitting.</span>
        </div>

        <fieldset className="bid-coverage__tasks">
          <legend className="bid-coverage__legend">
            {isTemplateTasks ? 'No tasks requested. Common cleaning tasks, if your price covers them' : 'Tasks your price covers'}
          </legend>
          <Cluster className="bid-coverage__task-list" gap={2}>
            {taskChoices.map((task) => (
              <Checkbox
                checked={fields.tasks.includes(task)}
                className="bid-coverage__task"
                key={task}
                label={task}
                onChange={(event) => toggleTask(task, event.target.checked)}
              />
            ))}
          </Cluster>
        </fieldset>

        <Field hint={`Requested: ${listing.visit_frequency ?? 'not stated'}. Blank means not stated.`} label="Visits per week">
          <Input
            className="bid-coverage__visits"
            inputMode="numeric"
            onChange={(event) => onChange({ visitsPerWeek: event.target.value })}
            placeholder="e.g. 3"
            value={fields.visitsPerWeek}
          />
        </Field>

        <div>
          <IncludedRow onChange={(value) => onChange({ equipmentIncluded: value })} requested={listing.equipment_included} term="Equipment" value={fields.equipmentIncluded} />
          <IncludedRow onChange={(value) => onChange({ suppliesIncluded: value })} requested={listing.supplies_included} term="Supplies" value={fields.suppliesIncluded} />
          <IncludedRow onChange={(value) => onChange({ taxesIncluded: value })} requested={listing.taxes_included} term="Taxes" value={fields.taxesIncluded} />
        </div>

        <Disclosure isDefaultOpen={hasExtras} summary="Other inclusions and exclusions" variant="card">
          <Grid minItemWidth="14rem">
            <Field hint="Separate items with commas" label="Also included">
              <Input onChange={(event) => onChange({ otherInclusions: event.target.value })} placeholder="e.g. window cleaning" value={fields.otherInclusions} />
            </Field>
            <Field hint="Separate items with commas" label="Excluded">
              <Input onChange={(event) => onChange({ exclusions: event.target.value })} placeholder="e.g. carpet shampoo" value={fields.exclusions} />
            </Field>
          </Grid>
        </Disclosure>
      </Stack>
    </Card>
  );
}
