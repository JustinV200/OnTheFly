/* The Terms section of the bid form: minimum term, availability, and whether the price depends on a site visit.
   Blank text is sent as not stated, never as an empty promise. */
import { Card, Checkbox, Field, Grid, Input, Stack } from '../../../../shared/ui';
import type { ChallengeFormFields } from '../../buildChallengePayload';

interface TermsFieldsProps {
  fields: ChallengeFormFields;
  onChange: (patch: Partial<ChallengeFormFields>) => void;
}

/** Render the terms card. */
export function TermsFields({ fields, onChange }: TermsFieldsProps): JSX.Element {
  return (
    <Card title="Terms">
      <Stack gap={4}>
        <Grid minItemWidth="14rem">
          <Field hint="Blank means not stated" label="Minimum term">
            <Input onChange={(event) => onChange({ minimumTerm: event.target.value })} placeholder="e.g. 12 months" value={fields.minimumTerm} />
          </Field>
          <Field hint="Blank means not stated" label="Availability">
            <Input onChange={(event) => onChange({ availability: event.target.value })} placeholder="e.g. can start Oct 1" value={fields.availability} />
          </Field>
        </Grid>
        <Checkbox
          checked={fields.siteVisitRequired}
          hint="Tick if the owner should expect the price to change after you see the site."
          label="Price depends on a site visit"
          onChange={(event) => onChange({ siteVisitRequired: event.target.checked })}
        />
      </Stack>
    </Card>
  );
}
