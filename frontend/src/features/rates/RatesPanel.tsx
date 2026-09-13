/* Your cost basis rates (roadmap 12, step 7): the private hourly rates Ways to save prices keep cost with. A buyer's are its
   current contract rates; a task owner's are its internal loaded costs. Private to this business, never in any public
   payload. Fixture rates are labeled demo data. Adding or removing one makes Ways to save recompute. */
import { useState } from 'react';

import { ApiError, del } from '../../shared/api/client';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { Badge, Button, Callout, Card, Icon, Stack, Table } from '../../shared/ui';
import { AddRateForm } from './AddRateForm';
import type { RateKind, RateListResponse } from './types';
import './RatesPanel.css';

interface RatesPanelProps {
  // The kind of rate this task is priced with for the viewer; the add form defaults to it.
  kind: RateKind;
  // Labor categories on the task, offered as suggestions in the add form.
  laborCategories: string[];
  onChanged: () => void;
}

const KIND_WORDS: Record<string, string> = {
  internal_cost: 'Internal cost',
  current_contract_rate: 'Contract rate',
};

/** Render the rate table and the add form. */
export function RatesPanel({ kind, laborCategories, onChanged }: RatesPanelProps): JSX.Element {
  const rates = useApiQuery<RateListResponse>('/api/rates');
  const [error, setError] = useState<string | null>(null);

  const remove = async (rateId: string): Promise<void> => {
    setError(null);
    try {
      await del(`/api/rates/${rateId}`);
      rates.reload();
      onChanged();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.message);
    }
  };

  const missing = laborCategories.filter((category) => !rates.data?.rates.some((rate) => rate.kind === kind && rate.labor_category === category));

  return (
    <Stack gap={5}>
      <Card
        actions={<Badge icon={<Icon name="lock" />} tone="private">Only your business sees these</Badge>}
        description={kind === 'internal_cost'
          ? 'You won this task, so keep cost is what the work costs you in-house: your internal loaded rates.'
          : 'You still own what you posted, so keep cost is what your current contract bills: your contract rates.'}
        padding="none"
        title="Your cost basis rates"
      >
        {!rates.data ? (
          rates.error ? <ErrorState error={rates.error} onRetry={rates.reload} title="Couldn’t load your rates" /> : <LoadingSpinner label="Loading your rates…" />
        ) : rates.data.rates.length === 0 ? (
          <p className="ui-text-muted ui-text-sm rates-panel__empty">No rates yet. Without them, Ways to save can’t suggest anything specific.</p>
        ) : (
          <Table density="compact" label="Your cost basis rates" layout="stack" minWidth="560px">
            <thead>
              <tr><th>Labor category</th><th>Kind</th><th className="ui-num">Rate</th><th>Source</th><th /></tr>
            </thead>
            <tbody>
              {rates.data.rates.map((rate) => (
                <tr key={rate.id}>
                  <td data-label="Labor category">{rate.labor_category}</td>
                  <td data-label="Kind">{KIND_WORDS[rate.kind] ?? rate.kind}{rate.task_id ? ' · this task only' : ''}</td>
                  <td className="ui-num" data-label="Rate"><MoneyDisplay amountMinor={rate.rate_minor_per_hour} currency={rate.currency} /> /h</td>
                  <td data-label="Source">
                    {rate.provenance === 'fixture'
                      ? <Badge tone="simulated" title="Seeded for the demo; not a real company's rates.">fixture · demo data</Badge>
                      : <Badge tone="neutral">owner-entered</Badge>}
                  </td>
                  <td data-label="">
                    <Button onClick={() => void remove(rate.id)} size="sm" variant="ghost">Remove</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {error ? <Callout role="alert" title="Couldn’t remove that rate" tone="danger"><p>{error}</p></Callout> : null}
      {missing.length > 0 && rates.data ? (
        <Callout role="note" title="Missing rates for this task" tone="warning">
          <p>No {KIND_WORDS[kind]?.toLowerCase()} for: {missing.join(', ')}. Those segments show “Add your rates” instead of a suggestion.</p>
        </Callout>
      ) : null}
      <AddRateForm defaultKind={kind} laborCategories={laborCategories} onAdded={() => { rates.reload(); onChanged(); }} />
    </Stack>
  );
}
