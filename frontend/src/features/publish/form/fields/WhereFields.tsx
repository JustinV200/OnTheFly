/* "Where": the approximate area a challenger prices travel and labour against. Street addresses are never asked for,
   so they can't be published (CLAUDE.md, "Never public"). Placeholders are examples only; blank publishes as not specified. */
import { Field, Grid, Input } from '../../../../shared/ui';
import { SCOPE_FIELD_IDS } from '../questions/scopeFieldIds';
import type { ScopeFormChange, ScopeFormValues } from '../state/scopeFormValues';
import type { ScopeExamples } from '../template/categoryFieldSet';
import { FormSection } from './FormSection';

interface WhereFieldsProps {
  values: ScopeFormValues;
  examples: ScopeExamples;
  onChange: ScopeFormChange;
}

/** Render the service area and approximate location inputs. */
export function WhereFields({ values, examples, onChange }: WhereFieldsProps): JSX.Element {
  return (
    <FormSection description="An approximate area only. A street address is never collected or published." title="Where">
      <Grid minItemWidth="220px">
        <Field hint="Shown on the market card." label="Service area">
          <Input
            id={SCOPE_FIELD_IDS.where}
            onChange={(event) => onChange({ serviceArea: event.target.value })}
            placeholder={`e.g. ${examples.serviceArea}`}
            value={values.serviceArea}
          />
        </Field>
        <Field hint="A city or neighbourhood." label="Approximate location">
          <Input
            onChange={(event) => onChange({ locationApproximate: event.target.value })}
            placeholder={`e.g. ${examples.locationApproximate}`}
            value={values.locationApproximate}
          />
        </Field>
      </Grid>
    </FormSection>
  );
}
