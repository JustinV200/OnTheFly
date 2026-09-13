/* One suggested vendor pair: how alike the names are, both groups' facts, what merging does, and the owner's two choices.
   The match figure only ranks candidates (CLAUDE.md, fly-brain circuits); the owner decides whether two vendors are one. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { Badge, Button, Cluster, Stack } from '../../../../shared/ui';
import type { VendorAliasSuggestion, VendorGroupSummary } from '../types';
import './AliasSuggestionRow.css';

interface AliasSuggestionRowProps {
  suggestion: VendorAliasSuggestion;
  // True while a merge or dismiss for this pair is in flight; both buttons wait for it.
  isPending: boolean;
  onMerge: () => Promise<void>;
  onDismiss: () => void;
}

/** Render one suggestion with its merge and dismiss buttons. */
export function AliasSuggestionRow({ suggestion, isPending, onMerge, onDismiss }: AliasSuggestionRowProps): JSX.Element {
  const { alias, canonical } = suggestion;

  return (
    <article className="alias-suggestion">
      <Stack gap={2}>
        <Cluster gap={2}>
          <Badge tone="neutral">Name match {Math.round(suggestion.name_similarity * 100)}%</Badge>
          {suggestion.shared_words.length > 0 ? (
            <span className="ui-text-sm ui-text-muted">Shared: {suggestion.shared_words.join(', ')}</span>
          ) : null}
        </Cluster>
        <p className="alias-suggestion__claim">
          <strong>{alias.vendor}</strong> <GroupFacts currency={suggestion.currency} group={alias} /> may be the same
          vendor as <strong>{canonical.vendor}</strong> <GroupFacts currency={suggestion.currency} group={canonical} />.
        </p>
        <p className="ui-text-sm ui-text-muted">
          Merging groups these charges under {canonical.vendor} now and on future imports. It does not publish anything.
        </p>
      </Stack>
      <Cluster className="alias-suggestion__actions" gap={2}>
        <Button isBusy={isPending} onClick={() => void onMerge()} size="sm">
          {isPending ? 'Working…' : `Merge into ${canonical.vendor}`}
        </Button>
        <Button disabled={isPending} onClick={onDismiss} size="sm">
          Not the same vendor
        </Button>
      </Cluster>
    </article>
  );
}

function GroupFacts({ group, currency }: { group: VendorGroupSummary; currency: string }): JSX.Element {
  return (
    <span className="ui-text-muted">
      ({group.charge_count} {group.charge_count === 1 ? 'charge' : 'charges'},{' '}
      <MoneyDisplay amountMinor={group.amount_minor_per_period} currency={currency} /> {group.cadence})
    </span>
  );
}
