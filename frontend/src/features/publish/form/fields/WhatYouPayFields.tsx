/* "What you pay": the price challengers counter, how often it is charged, and which costs it includes.
   Price and cadence are the only prefilled values, from the transaction baseline, and say so; the included-cost
   questions start unanswered. The server publishes price and cadence as a pair, so both are confirmed here together. */
import type { ChangeEvent } from 'react';

import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { parseDollarsToMinor } from '../../../../shared/format/parseDollarsToMinor';
import { Field, Grid, Icon, Input, Select, Stack } from '../../../../shared/ui';
import type { PublishableExpense } from '../../types';
import { SCOPE_FIELD_IDS } from '../questions/scopeFieldIds';
import type { ScopeFormChange, ScopeFormValues } from '../state/scopeFormValues';
import { FormSection } from './FormSection';
import { IncludedCostControl } from './IncludedCostControl';
import { PrefixedInput } from './PrefixedInput';
import './WhatYouPayFields.css';

// Cadences the backend can restate per month (backend app/core/cadence.py).
const CADENCES = ['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'annual'];

interface WhatYouPayFieldsProps {
  expense: PublishableExpense | undefined;
  values: ScopeFormValues;
  onChange: ScopeFormChange;
  priceError?: string;
  cadenceError?: string;
}

/** Render the baseline note, price and cadence inputs, and the three included-cost questions. */
export function WhatYouPayFields({ expense, values, onChange, priceError, cadenceError }: WhatYouPayFieldsProps): JSX.Element {
  // An inferred cadence like "irregular" stays selectable so the server can explain why it can't publish.
  const cadenceOptions = CADENCES.includes(values.billingCadence) || !values.billingCadence ? CADENCES : [values.billingCadence, ...CADENCES];
  // Equality only (no arithmetic): is the typed pair still exactly the transaction baseline?
  const isBaseline = expense !== undefined
    && parseDollarsToMinor(values.currentPrice) === expense.amount_minor_per_period
    && values.billingCadence === expense.cadence;
  const isUsd = (expense?.currency ?? 'USD') === 'USD';
  const priceInputProps = {
    inputMode: 'decimal' as const,
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange({ currentPrice: event.target.value }),
    placeholder: 'e.g. 2,400',
    value: values.currentPrice,
  };

  return (
    <FormSection description="The price bidders see and try to beat." title="What you pay">
      <Stack gap={3}>
        <p className="publish-pay__baseline">
          <Icon name="info" size={14} />
          {isBaseline || !expense ? (
            <span>From your transactions — confirm or correct</span>
          ) : (
            <span>
              Corrected by you. Your transactions show <MoneyDisplay amountMinor={expense.amount_minor_per_period} currency={expense.currency} /> / {expense.cadence}.
            </span>
          )}
        </p>
        <Grid minItemWidth="200px">
          <Field error={priceError} hint={isUsd ? 'In US dollars, per billing period.' : `In ${expense?.currency}, per billing period.`} label="Current price">
            {isUsd ? <PrefixedInput prefix="$" {...priceInputProps} /> : <Input {...priceInputProps} />}
          </Field>
          <Field error={cadenceError} label="Billed">
            <Select onChange={(event) => onChange({ billingCadence: event.target.value })} value={values.billingCadence}>
              {values.billingCadence ? null : <option value="">Choose…</option>}
              {cadenceOptions.map((cadence) => <option key={cadence} value={cadence}>{cadence}</option>)}
            </Select>
          </Field>
        </Grid>
      </Stack>

      <div>
        <h4 className="publish-pay__included-title">Does that price include…</h4>
        <IncludedCostControl
          id={SCOPE_FIELD_IDS.suppliesIncluded}
          onChange={(answer) => onChange({ suppliesIncluded: answer })}
          question="Supplies"
          value={values.suppliesIncluded}
        />
        <IncludedCostControl
          id={SCOPE_FIELD_IDS.equipmentIncluded}
          onChange={(answer) => onChange({ equipmentIncluded: answer })}
          question="Equipment"
          value={values.equipmentIncluded}
        />
        <IncludedCostControl
          id={SCOPE_FIELD_IDS.taxesIncluded}
          onChange={(answer) => onChange({ taxesIncluded: answer })}
          question="Taxes"
          value={values.taxesIncluded}
        />
      </div>
    </FormSection>
  );
}
