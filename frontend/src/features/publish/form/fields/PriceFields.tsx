/* The price the listing publishes, its billing cadence, and the optional offer deadline.
   The server publishes price and cadence as a pair, so both are confirmed here together. */
import { Field, Grid, Input, Select } from '../../../../shared/ui';
import { FormSection } from '../FormSection';
import type { ScopeFormChange, ScopeFormValues } from '../scopeFormValues';

// Cadences the backend can restate per month (backend app/core/cadence.py).
const CADENCES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annual'];

interface PriceFieldsProps {
  values: ScopeFormValues;
  onChange: ScopeFormChange;
  // Set when the last submit couldn't read the price; marks the input invalid.
  priceError: string | null;
}

/** Render current price, billing cadence, and deadline inputs. */
export function PriceFields({ values, onChange, priceError }: PriceFieldsProps): JSX.Element {
  // An inferred cadence like "irregular" stays selectable so the server can explain why it can't publish.
  const cadenceOptions = CADENCES.includes(values.billingCadence) || !values.billingCadence ? CADENCES : [values.billingCadence, ...CADENCES];

  return (
    <FormSection
      description="This is the price challengers see and counter. It starts from your transactions; confirm or correct it."
      title="Current price and deadline"
    >
      <Grid minItemWidth="200px">
        <Field error={priceError ?? undefined} hint="In dollars, for example 2400 or 2,400.00." label="Current price ($, confirm or correct)">
          <Input inputMode="decimal" onChange={(event) => onChange({ currentPrice: event.target.value })} value={values.currentPrice} />
        </Field>
        <Field hint="How often that price is charged." label="Billing cadence">
          <Select onChange={(event) => onChange({ billingCadence: event.target.value })} value={values.billingCadence}>
            {cadenceOptions.map((cadence) => <option key={cadence} value={cadence}>{cadence}</option>)}
          </Select>
        </Field>
        <Field hint="Offers close at the end of this day. Blank means no deadline." label="Offer deadline (optional)">
          <Input onChange={(event) => onChange({ deadlineDate: event.target.value })} type="date" value={values.deadlineDate} />
        </Field>
      </Grid>
    </FormSection>
  );
}
