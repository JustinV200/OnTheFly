/* The price fields of the challenge form: the amount, how often it is billed, and any setup fee.
   Amounts stay as typed text here; buildChallengePayload parses them into minor units and reports anything unreadable. */
import { Field, Grid, Input, Select } from '../../../shared/ui';
import type { ChallengeFormFields } from '../buildChallengePayload';
import './PriceFields.css';

// Must stay in sync with BillingFrequency in backend/app/api/challenges/schemas.py.
const FREQUENCIES = ['monthly', 'weekly', 'biweekly', 'bimonthly', 'quarterly', 'annual'];

interface PriceFieldsProps {
  fields: ChallengeFormFields;
  onChange: (patch: Partial<ChallengeFormFields>) => void;
}

/** Render the price, billing frequency, and setup fee inputs. */
export function PriceFields({ fields, onChange }: PriceFieldsProps): JSX.Element {
  // A stored offer can use a frequency this list doesn't name (the API also accepts "yearly"). It is shown as its own
  // option, since a select with no matching option displays the first one while submitting the stored value.
  const frequencyChoices = FREQUENCIES.includes(fields.billingFrequency) ? FREQUENCIES : [...FREQUENCIES, fields.billingFrequency];

  return (
    <Grid minItemWidth="11rem">
      <Field hint="Charged each billing period" label="Your price ($)">
        <Input
          className="challenge-price__control challenge-price__amount"
          inputMode="decimal"
          onChange={(event) => onChange({ price: event.target.value })}
          placeholder="1875"
          value={fields.price}
        />
      </Field>
      <Field label="Billed">
        <Select className="challenge-price__control" onChange={(event) => onChange({ billingFrequency: event.target.value })} value={fields.billingFrequency}>
          {frequencyChoices.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
        </Select>
      </Field>
      <Field hint="Leave blank for none" label="Setup fee ($)">
        <Input className="challenge-price__control" inputMode="decimal" onChange={(event) => onChange({ setupFee: event.target.value })} value={fields.setupFee} />
      </Field>
    </Grid>
  );
}
