/* Adds one owner-entered rate: labor category (the task's categories are suggested), kind, dollars per hour and the date it
   takes effect. The server labels it owner-entered and marks this business's Ways to save cards stale. */
import { FormEvent, useId, useState } from 'react';

import { ApiError, post } from '../../shared/api/client';
import { parseDollarsToMinor } from '../../shared/format/parseDollarsToMinor';
import { Button, Callout, Card, Cluster, Field, Grid, Input, Select, Stack } from '../../shared/ui';
import type { RateKind } from './types';

interface AddRateFormProps {
  defaultKind: RateKind;
  laborCategories: string[];
  // The category the form starts on, e.g. one the rates panel named as missing.
  initialCategory: string;
  // True when the owner chose a missing category above: the cursor goes straight to the dollars field.
  isRateFocusedOnMount: boolean;
  onAdded: () => void;
  // Closes the form without adding anything; the panel only mounts the form on request, so it needs a way back out.
  onCancel: () => void;
}

/** Render the add-rate form. */
export function AddRateForm({ defaultKind, laborCategories, initialCategory, isRateFocusedOnMount, onAdded, onCancel }: AddRateFormProps): JSX.Element {
  const listId = useId();
  const [category, setCategory] = useState(initialCategory);
  const [kind, setKind] = useState<RateKind>(defaultKind);
  const [rateText, setRateText] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const rateMinor = parseDollarsToMinor(rateText);
    if (!category.trim()) {
      setError('Name the labor category exactly as it appears on the task.');
      return;
    }
    if (rateMinor === null || rateMinor === 0) {
      setError('Enter an hourly rate above $0, for example 135.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await post('/api/rates', { kind, labor_category: category.trim(), rate_minor_per_hour: rateMinor, currency: 'USD', effective_date: effectiveDate });
      setRateText('');
      onAdded();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card title="Add a rate" titleLevel={3}>
      <form noValidate onSubmit={(event) => void submit(event)}>
        <Stack gap={4}>
          <Grid minItemWidth="12rem">
            <Field hint="Must match the task's labor category exactly" label="Labor category">
              <Input list={listId} onChange={(event) => setCategory(event.target.value)} value={category} />
            </Field>
            <Field label="Kind">
              <Select onChange={(event) => setKind(event.target.value as RateKind)} value={kind}>
                <option value="internal_cost">Internal loaded cost</option>
                <option value="current_contract_rate">Current contract rate</option>
              </Select>
            </Field>
            <Field label="Dollars per hour">
              <Input autoFocus={isRateFocusedOnMount} inputMode="decimal" onChange={(event) => setRateText(event.target.value)} placeholder="e.g. 135" value={rateText} />
            </Field>
            <Field label="Effective from">
              <Input onChange={(event) => setEffectiveDate(event.target.value)} type="date" value={effectiveDate} />
            </Field>
          </Grid>
          <datalist id={listId}>
            {laborCategories.map((option) => <option key={option} value={option} />)}
          </datalist>
          {error ? <Callout role="alert" title="Not added" tone="danger"><p>{error}</p></Callout> : null}
          <Cluster gap={2}>
            <Button isBusy={isSaving} type="submit">{isSaving ? 'Adding…' : 'Add rate'}</Button>
            <Button onClick={onCancel} variant="ghost">Cancel</Button>
          </Cluster>
        </Stack>
      </form>
    </Card>
  );
}
