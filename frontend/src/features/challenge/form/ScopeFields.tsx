/* The scope card of the challenge form: what the owner requested, and which of it the challenger's price covers.
   Blank and "not stated" stay distinct from "not included", so an offer is never scored on an answer nobody gave. */
import { TriStateSelect } from '../../../shared/components/TriStateSelect';
import { describeScopeExpectations } from '../../../shared/format/describeScopeExpectations';
import { Button, Card, Checkbox, Cluster, Field, Grid, Input, Stack } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import type { ChallengeFormFields } from '../buildChallengePayload';
import './ScopeFields.css';

interface ScopeFieldsProps {
  fields: ChallengeFormFields;
  listing: PublicListingProjection;
  // The task checkboxes to show: the listing's required tasks, or the template's when it names none.
  taskChoices: string[];
  isTemplateTasks: boolean;
  onChange: (patch: Partial<ChallengeFormFields>) => void;
  onMatchRequestedScope: () => void;
}

/** Render the requested scope summary, the full-scope shortcut, task checkboxes, and the scope term inputs. */
export function ScopeFields({ fields, listing, taskChoices, isTemplateTasks, onChange, onMatchRequestedScope }: ScopeFieldsProps): JSX.Element {
  const toggleTask = (task: string, isChecked: boolean): void => {
    onChange({ tasks: isChecked ? [...fields.tasks, task] : fields.tasks.filter((item) => item !== task) });
  };

  return (
    <Card title="What your price covers">
      <Stack gap={5}>
        <Card
          actions={<Button onClick={onMatchRequestedScope} size="sm">Offer the full requested scope</Button>}
          padding="sm"
          title="Requested by the owner"
          titleLevel={3}
          tone="subtle"
        >
          <dl className="challenge-scope__requested">
            <dt>Requested</dt>
            <dd>{listing.scope_summary}</dd>
            <dt>Requested terms</dt>
            <dd>{describeScopeExpectations(listing)}</dd>
          </dl>
        </Card>

        <fieldset className="challenge-scope__tasks">
          <legend className="challenge-scope__legend">
            {isTemplateTasks ? 'This listing names no required tasks. Common cleaning tasks, if your price covers them:' : 'Required tasks your price covers'}
          </legend>
          <Cluster className="challenge-scope__task-list" gap={2}>
            {taskChoices.map((task) => (
              <Checkbox
                checked={fields.tasks.includes(task)}
                className="challenge-scope__task"
                key={task}
                label={task}
                onChange={(event) => toggleTask(task, event.target.checked)}
              />
            ))}
          </Cluster>
        </fieldset>

        <Grid minItemWidth="9rem">
          <Field hint="Blank means not stated" label="Visits per week">
            <Input inputMode="numeric" onChange={(event) => onChange({ visitsPerWeek: event.target.value })} value={fields.visitsPerWeek} />
          </Field>
          <TriStateSelect label="Equipment" onChange={(value) => onChange({ equipmentIncluded: value })} value={fields.equipmentIncluded} />
          <TriStateSelect label="Supplies" onChange={(value) => onChange({ suppliesIncluded: value })} value={fields.suppliesIncluded} />
          <TriStateSelect label="Taxes" onChange={(value) => onChange({ taxesIncluded: value })} value={fields.taxesIncluded} />
        </Grid>
        <Grid minItemWidth="16rem">
          <Field hint="Separate items with commas" label="Other inclusions">
            <Input onChange={(event) => onChange({ otherInclusions: event.target.value })} value={fields.otherInclusions} />
          </Field>
          <Field hint="Separate items with commas" label="Exclusions">
            <Input onChange={(event) => onChange({ exclusions: event.target.value })} value={fields.exclusions} />
          </Field>
        </Grid>
      </Stack>
    </Card>
  );
}
