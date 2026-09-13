/* The Price section of the bid form: the amount and how often it is billed, then where prefilled values came from.
   The bidding mode is not explained again here: the header pill states it before any field, and the summary beside the
   submit button carries the one explanation. The setup fee lives under "Add details". Amounts stay as typed text here;
   buildChallengePayload parses them into minor units and reports anything unreadable. */
import type { ReactNode } from 'react';

import { BILLING_OPTIONS, billingLabel, perPeriodWords } from '../../../../shared/market';
import { Card, Field, Grid, Select, Stack } from '../../../../shared/ui';
import type { ChallengeFormFields } from '../../buildChallengePayload';
import { PrefixedInput } from './PrefixedInput';
import './PriceFields.css';

interface PriceFieldsProps {
  fields: ChallengeFormFields;
  onChange: (patch: Partial<ChallengeFormFields>) => void;
  // The listing's currency, which every offer is stored in; "$" is drawn only for USD.
  currency: string;
  // The listing's billing cadence, named in the hint when the bidder picks a different period.
  listingCadence: string;
  // Where the starting price came from (the bid ticket or the current offer), under the fields.
  origin: ReactNode;
}

/** Render the price card. */
export function PriceFields({ fields, onChange, currency, listingCadence, origin }: PriceFieldsProps): JSX.Element {
  // A stored offer can use a frequency this list doesn't name (the API also accepts "yearly"). It is shown as its own
  // option, since a select with no matching option displays the first one while submitting the stored value.
  const isListedFrequency = BILLING_OPTIONS.some((option) => option.value === fields.billingFrequency);
  const frequencyChoices = isListedFrequency ? BILLING_OPTIONS : [...BILLING_OPTIONS, { value: fields.billingFrequency, label: billingLabel(fields.billingFrequency) }];
  const prefix = currency === 'USD' ? '$' : `${currency} `;
  const unitWords = currency === 'USD' ? 'In US dollars' : `In ${currency}`;
  // The hint follows the Billed choice, so it never says "per year" over a monthly price; a different period from the
  // listing's is named too, since nothing converts it and the business compares offers on its own terms.
  const periodHint = fields.billingFrequency === listingCadence
    ? `${unitWords}, ${perPeriodWords(fields.billingFrequency)}`
    : `${unitWords}, ${perPeriodWords(fields.billingFrequency)}. The listing is priced ${perPeriodWords(listingCadence)}.`;

  return (
    <Card title="Price">
      <Stack gap={4}>
        <Grid minItemWidth="11rem">
          <Field hint={periodHint} label="Your price">
            <PrefixedInput
              className="bid-price__amount"
              inputMode="decimal"
              onChange={(event) => onChange({ price: event.target.value })}
              // No example figure: a made-up number anchors bids on a listing whose scale it knows nothing about.
              placeholder={`Amount in ${currency}`}
              prefix={prefix}
              value={fields.price}
            />
          </Field>
          <Field label="Billed">
            <Select className="bid-price__control" onChange={(event) => onChange({ billingFrequency: event.target.value })} value={fields.billingFrequency}>
              {frequencyChoices.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
        </Grid>
        {origin}
      </Stack>
    </Card>
  );
}
