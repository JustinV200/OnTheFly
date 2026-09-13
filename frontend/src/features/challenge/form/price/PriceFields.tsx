/* The Price section of the bid form: the bidding terms first (a challenger must never find out afterwards that their
   price went public), then the amount, how often it is billed, and any setup fee, then where prefilled values came from.
   Amounts stay as typed text here; buildChallengePayload parses them into minor units and reports anything unreadable. */
import type { ReactNode } from 'react';

import { Card, Field, Grid, Select, Stack } from '../../../../shared/ui';
import type { ChallengeFormFields } from '../../buildChallengePayload';
import { BILLING_FREQUENCIES } from '../billingFrequencies';
import { PrefixedInput } from './PrefixedInput';
import './PriceFields.css';

interface PriceFieldsProps {
  fields: ChallengeFormFields;
  onChange: (patch: Partial<ChallengeFormFields>) => void;
  // The listing's currency, which every offer is stored in; "$" is drawn only for USD.
  currency: string;
  // The bidding terms callout, rendered above the first field.
  terms: ReactNode;
  // Where the starting price came from (the bid ticket or the current offer), under the fields.
  origin: ReactNode;
}

/** Render the price card. */
export function PriceFields({ fields, onChange, currency, terms, origin }: PriceFieldsProps): JSX.Element {
  // A stored offer can use a frequency this list doesn't name (the API also accepts "yearly"). It is shown as its own
  // option, since a select with no matching option displays the first one while submitting the stored value.
  const frequencyChoices = BILLING_FREQUENCIES.includes(fields.billingFrequency) ? BILLING_FREQUENCIES : [...BILLING_FREQUENCIES, fields.billingFrequency];
  const prefix = currency === 'USD' ? '$' : `${currency} `;
  const unitHint = currency === 'USD' ? 'In US dollars' : `In ${currency}`;

  return (
    <Card title="Price">
      <Stack gap={4}>
        {terms}
        <Grid minItemWidth="11rem">
          <Field hint={`${unitHint}, per billing period`} label="Your price">
            <PrefixedInput
              className="bid-price__amount"
              inputMode="decimal"
              onChange={(event) => onChange({ price: event.target.value })}
              placeholder="e.g. 1,875"
              prefix={prefix}
              value={fields.price}
            />
          </Field>
          <Field label="Billed">
            <Select className="bid-price__control" onChange={(event) => onChange({ billingFrequency: event.target.value })} value={fields.billingFrequency}>
              {frequencyChoices.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
            </Select>
          </Field>
          <Field hint="Leave blank for none" label="Setup fee">
            <PrefixedInput
              className="bid-price__control"
              inputMode="decimal"
              onChange={(event) => onChange({ setupFee: event.target.value })}
              placeholder="e.g. 250"
              prefix={prefix}
              value={fields.setupFee}
            />
          </Field>
        </Grid>
        {origin}
      </Stack>
    </Card>
  );
}
