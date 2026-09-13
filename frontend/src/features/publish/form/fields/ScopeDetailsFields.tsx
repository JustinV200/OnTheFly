/* The scope a challenger prices against: where, how big, how often, what's required, and what the price includes.
   Blank and "Not stated" stay open questions for challengers; nothing here is guessed from the vendor name. */
import { TriStateSelect } from '../../../../shared/components/TriStateSelect';
import { Field, Grid, Input } from '../../../../shared/ui';
import { FormSection } from '../FormSection';
import type { ScopeFormChange, ScopeFormValues } from '../scopeFormValues';

interface ScopeDetailsFieldsProps {
  values: ScopeFormValues;
  onChange: ScopeFormChange;
}

/** Render the scope inputs as controlled native controls (the form's onChange hears every one). */
export function ScopeDetailsFields({ values, onChange }: ScopeDetailsFieldsProps): JSX.Element {
  return (
    <FormSection
      description="What a challenger prices against. Leave what you don’t know blank or “Not stated” rather than guessing."
      title="Scope"
    >
      <Grid minItemWidth="200px">
        <Field hint="Listings show an approximate area only." label="Service area">
          <Input onChange={(event) => onChange({ serviceArea: event.target.value })} value={values.serviceArea} />
        </Field>
        <Field hint="A city or neighbourhood, not a street address." label="Approximate location">
          <Input onChange={(event) => onChange({ locationApproximate: event.target.value })} value={values.locationApproximate} />
        </Field>
        <Field hint="Blank means not stated." label="Square footage">
          <Input inputMode="numeric" onChange={(event) => onChange({ squareFootage: event.target.value })} value={values.squareFootage} />
        </Field>
        <Field hint="For example 3x weekly." label="Visit frequency">
          <Input onChange={(event) => onChange({ visitFrequency: event.target.value })} value={values.visitFrequency} />
        </Field>
        <Field hint="Blank means not stated." label="Bathrooms">
          <Input inputMode="numeric" onChange={(event) => onChange({ bathroomCount: event.target.value })} value={values.bathroomCount} />
        </Field>
        <Field hint="Comma separated." label="Required tasks">
          <Input onChange={(event) => onChange({ requiredTasks: event.target.value })} value={values.requiredTasks} />
        </Field>
        <TriStateSelect label="Supplies" onChange={(value) => onChange({ suppliesIncluded: value })} value={values.suppliesIncluded} />
        <TriStateSelect label="Equipment" onChange={(value) => onChange({ equipmentIncluded: value })} value={values.equipmentIncluded} />
        <TriStateSelect label="Taxes" onChange={(value) => onChange({ taxesIncluded: value })} value={values.taxesIncluded} />
      </Grid>
    </FormSection>
  );
}
