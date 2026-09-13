/* "What you buy": how often, which tasks, and how big the job is. The fields follow the expense's category
   (no bathrooms for pest control), and nothing is guessed from the vendor name; blank publishes as not specified. */
import { Field, Grid, Input } from '../../../../shared/ui';
import { SCOPE_FIELD_IDS } from '../questions/scopeFieldIds';
import type { ScopeFormChange, ScopeFormValues } from '../state/scopeFormValues';
import type { CategoryFieldSet } from '../template/categoryFieldSet';
import { FormSection } from './FormSection';

interface WhatYouBuyFieldsProps {
  values: ScopeFormValues;
  fieldSet: CategoryFieldSet;
  onChange: ScopeFormChange;
  squareFootageError?: string;
  bathroomCountError?: string;
}

/** Render the visit frequency, tasks, size, and (for cleaning) bathroom inputs. */
export function WhatYouBuyFields({ values, fieldSet, onChange, squareFootageError, bathroomCountError }: WhatYouBuyFieldsProps): JSX.Element {
  const { examples } = fieldSet;

  return (
    <FormSection description="What a challenger prices against. Leave anything you don’t know blank rather than guessing." title="What you buy">
      <Grid minItemWidth="220px">
        <Field label="How often">
          <Input
            id={SCOPE_FIELD_IDS.visitFrequency}
            onChange={(event) => onChange({ visitFrequency: event.target.value })}
            placeholder={`e.g. ${examples.visitFrequency}`}
            value={values.visitFrequency}
          />
        </Field>
        <Field hint="Separate tasks with commas." label="Required tasks">
          <Input
            id={SCOPE_FIELD_IDS.requiredTasks}
            onChange={(event) => onChange({ requiredTasks: event.target.value })}
            placeholder={`e.g. ${examples.requiredTasks}`}
            value={values.requiredTasks}
          />
        </Field>
        <Field error={squareFootageError} label="Square footage">
          <Input
            id={SCOPE_FIELD_IDS.squareFootage}
            inputMode="numeric"
            onChange={(event) => onChange({ squareFootage: event.target.value })}
            placeholder={`e.g. ${examples.squareFootage}`}
            value={values.squareFootage}
          />
        </Field>
        {fieldSet.hasBathrooms ? (
          <Field error={bathroomCountError} label="Bathrooms">
            <Input
              id={SCOPE_FIELD_IDS.bathroomCount}
              inputMode="numeric"
              onChange={(event) => onChange({ bathroomCount: event.target.value })}
              placeholder={`e.g. ${examples.bathroomCount}`}
              value={values.bathroomCount}
            />
          </Field>
        ) : null}
      </Grid>
    </FormSection>
  );
}
