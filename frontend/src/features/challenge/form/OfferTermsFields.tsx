/* The remaining terms of a counteroffer: minimum term, availability, a message to the owner, and site-visit pricing. */
import { Card, Checkbox, Field, Grid, Input, Stack } from '../../../shared/ui';
import type { ChallengeFormFields } from '../buildChallengePayload';

interface OfferTermsFieldsProps {
  fields: ChallengeFormFields;
  onChange: (patch: Partial<ChallengeFormFields>) => void;
}

/** Render the optional offer terms card. Blank text fields are sent as not stated. */
export function OfferTermsFields({ fields, onChange }: OfferTermsFieldsProps): JSX.Element {
  return (
    <Card title="Terms and message">
      <Stack gap={4}>
        <Grid minItemWidth="14rem">
          <Field label="Minimum term">
            <Input onChange={(event) => onChange({ minimumTerm: event.target.value })} placeholder="e.g. 12 months" value={fields.minimumTerm} />
          </Field>
          <Field label="Availability">
            <Input onChange={(event) => onChange({ availability: event.target.value })} placeholder="e.g. can start Oct 1" value={fields.availability} />
          </Field>
        </Grid>
        {/* Kept a single-line input: a textarea would start sending line breaks the owner's views don't render. */}
        <Field label="Message to the owner">
          <Input onChange={(event) => onChange({ message: event.target.value })} value={fields.message} />
        </Field>
        <Checkbox
          checked={fields.siteVisitRequired}
          label="Price depends on a site visit"
          onChange={(event) => onChange({ siteVisitRequired: event.target.checked })}
        />
      </Stack>
    </Card>
  );
}
