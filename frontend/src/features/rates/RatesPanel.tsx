/* Your cost basis rates (roadmap 12, step 7): the private hourly rates Ways to save prices keep cost with. A buyer's are its
   current contract rates; a task owner's are its internal loaded costs. Private to this business, never in any public
   payload. Fixture rates are labeled demo data. Adding or removing one makes Ways to save recompute.
   There is one way in to the add form — "Add a rate…" in the header, or a missing category's link, which opens the same
   form on that category — so the panel doesn't end in an empty form nobody asked for. */
import { useState } from 'react';

import { ApiError, del } from '../../shared/api/client';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { Badge, Button, Callout, Card, Cluster, Icon, Stack, Table } from '../../shared/ui';
import { AddRateForm } from './AddRateForm';
import { missingRateCategories } from './missingRateCategories';
import type { RateKind, RateListResponse } from './types';
import './RatesPanel.css';

interface RatesPanelProps {
  taskId: string;
  currency: string;
  // The kind of rate this task is priced with for the viewer; the add form defaults to it.
  kind: RateKind;
  // Labor categories of the requirements still with the task: the ones keep cost needs a rate for.
  laborCategories: string[];
  onChanged: () => void;
}

// The open add form, or null when it is closed. The category it starts on is remembered so the form can remount on it.
interface AddTarget {
  category: string;
  // True when the viewer picked a named missing category, so the cursor can skip straight to the dollars field.
  isFromMissingCategory: boolean;
}

const KIND_WORDS: Record<string, string> = {
  internal_cost: 'Internal cost',
  current_contract_rate: 'Contract rate',
};

/** Render the rate table, which categories still need a rate, and the add form once it is asked for. */
export function RatesPanel({ taskId, currency, kind, laborCategories, onChanged }: RatesPanelProps): JSX.Element {
  const rates = useApiQuery<RateListResponse>('/api/rates');
  const [error, setError] = useState<string | null>(null);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);

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

  const missing = rates.data ? missingRateCategories(rates.data.rates, { taskId, currency, kind, laborCategories }) : [];

  return (
    <Stack gap={5}>
      <Card
        actions={(
          <Cluster gap={2}>
            <Badge icon={<Icon name="lock" />} tone="private">Only your business sees these</Badge>
            <Button onClick={() => setAddTarget({ category: missing[0] ?? laborCategories[0] ?? '', isFromMissingCategory: false })} size="sm" variant="secondary">
              Add a rate…
            </Button>
          </Cluster>
        )}
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
                  <td data-label="Kind">{KIND_WORDS[rate.kind] ?? rate.kind}{rate.task_id ? ' · one task only' : ''}</td>
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
      {missing.length > 0 ? (
        // Info, not warning: a missing rate really does stop keep cost computing for that group, but nothing is broken
        // and the fix is one click away in the same panel.
        <Callout
          role="note"
          title={missing.length === 1 ? `Add a rate for ${missing[0]}` : `Add rates for ${missing.length} labor categories`}
          tone="info"
        >
          <p>
            Keep cost needs your {(KIND_WORDS[kind] ?? kind).toLowerCase()} in {currency} for each labor category still with this
            task. Until then, those groups show “Needs your rate” in Ways to save instead of a suggestion:
          </p>
          <ul className="rates-panel__missing">
            {missing.map((category) => (
              <li key={category}>
                <strong>{category}</strong>{' '}
                <Button onClick={() => setAddTarget({ category, isFromMissingCategory: true })} size="sm" variant="link">Add a rate</Button>
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}
      {addTarget ? (
        <AddRateForm
          defaultKind={kind}
          initialCategory={addTarget.category}
          isRateFocusedOnMount={addTarget.isFromMissingCategory}
          // Remounts when the viewer picks a different category, so the form starts on the one they named.
          key={addTarget.category || 'blank'}
          laborCategories={laborCategories}
          onAdded={() => {
            setAddTarget(null);
            rates.reload();
            onChanged();
          }}
          onCancel={() => setAddTarget(null)}
        />
      ) : null}
    </Stack>
  );
}
