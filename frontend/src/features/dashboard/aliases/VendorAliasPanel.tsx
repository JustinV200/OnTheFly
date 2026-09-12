/* Shows possible duplicate vendors found by the Mushroom Body FlyHash circuit.
   Nothing merges without the owner's click, and a merge never publishes anything. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { FlyBrainBadge } from '../../../shared/flybrain/FlyBrainBadge';
import { FlyBrainNote } from '../../../shared/flybrain/FlyBrainNote';
import type { VendorAliasSuggestion, VendorGroupSummary } from './types';
import { useVendorAliases } from './useVendorAliases';

interface VendorAliasPanelProps {
  /** Called after a merge succeeds so the dashboard can reload its expense rows. */
  onMerged: () => void;
}

/** Render duplicate-vendor suggestions; renders nothing when there are none and nothing failed. */
export function VendorAliasPanel({ onMerged }: VendorAliasPanelProps): JSX.Element | null {
  const { suggestions, attributions, error, pendingAliasId, merge, dismiss } = useVendorAliases();

  if (suggestions.length === 0 && !error) {
    return null;
  }

  return (
    <section
      aria-label="Possible duplicate vendors"
      style={{ border: '1px solid #f59e0b', borderRadius: '12px', marginBottom: '1rem', padding: '0.75rem 1rem' }}
    >
      <h3 style={{ marginTop: 0 }}>Possible duplicate vendors</h3>
      {error ? <p role="alert">{error}</p> : null}
      {suggestions.map((suggestion) => (
        <SuggestionRow
          key={suggestion.alias.expense_id}
          suggestion={suggestion}
          attributionBadge={attributions[0] ? <FlyBrainBadge attribution={attributions[0]} /> : null}
          isPending={pendingAliasId === suggestion.alias.expense_id}
          onMerge={async () => {
            if (await merge(suggestion)) {
              onMerged();
            }
          }}
          onDismiss={() => void dismiss(suggestion)}
        />
      ))}
      <FlyBrainNote attributions={attributions} />
    </section>
  );
}

interface SuggestionRowProps {
  suggestion: VendorAliasSuggestion;
  attributionBadge: JSX.Element | null;
  isPending: boolean;
  onMerge: () => Promise<void>;
  onDismiss: () => void;
}

function SuggestionRow({ suggestion, attributionBadge, isPending, onMerge, onDismiss }: SuggestionRowProps): JSX.Element {
  const { alias, canonical } = suggestion;

  return (
    <article style={{ borderTop: '1px solid #fde68a', padding: '0.6rem 0' }}>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {attributionBadge}
        <span>Name match {Math.round(suggestion.name_similarity * 100)}%</span>
        {suggestion.shared_words.length > 0 ? <span>· shared: {suggestion.shared_words.join(', ')}</span> : null}
      </div>
      <p style={{ margin: '0.4rem 0' }}>
        <strong>{alias.vendor}</strong> <GroupFacts group={alias} currency={suggestion.currency} /> may be the same
        vendor as <strong>{canonical.vendor}</strong> <GroupFacts group={canonical} currency={suggestion.currency} />.
      </p>
      <p style={{ color: '#475569', fontSize: '0.85rem', margin: '0 0 0.4rem' }}>
        Merging groups these charges under {canonical.vendor} now and on future imports. It does not publish anything.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button disabled={isPending} onClick={() => void onMerge()} type="button">
          {isPending ? 'Working…' : `Merge into ${canonical.vendor}`}
        </button>
        <button disabled={isPending} onClick={onDismiss} type="button">
          Not the same vendor
        </button>
      </div>
    </article>
  );
}

function GroupFacts({ group, currency }: { group: VendorGroupSummary; currency: string }): JSX.Element {
  return (
    <span style={{ color: '#475569' }}>
      ({group.charge_count} {group.charge_count === 1 ? 'charge' : 'charges'},{' '}
      <MoneyDisplay amountMinor={group.amount_minor_per_period} currency={currency} /> {group.cadence})
    </span>
  );
}
