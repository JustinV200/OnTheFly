/* Shows possible duplicate vendors found by the Mushroom Body FlyHash circuit, as an outlined suggestion card.
   Nothing merges without the owner's click, and a merge never publishes anything. */
import { FlyBrainBadge } from '../../../shared/flybrain/FlyBrainBadge';
import { FlyBrainNote } from '../../../shared/flybrain/FlyBrainNote';
import { Callout, Card, Stack } from '../../../shared/ui';
import { AliasSuggestionRow } from './AliasSuggestionRow';
import { useVendorAliases } from './useVendorAliases';
import './VendorAliasPanel.css';

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
    <Card
      actions={attributions.map((attribution) => <FlyBrainBadge attribution={attribution} key={attribution.component} />)}
      title="Possible duplicate vendors"
      tone="outlined"
    >
      <Stack gap={4}>
        {error ? <Callout role="alert" tone="danger">{error}</Callout> : null}
        {suggestions.length > 0 ? (
          <ul className="alias-suggestions">
            {suggestions.map((suggestion) => (
              <li className="alias-suggestions__item" key={suggestion.alias.expense_id}>
                <AliasSuggestionRow
                  isPending={pendingAliasId === suggestion.alias.expense_id}
                  onDismiss={() => void dismiss(suggestion)}
                  onMerge={async () => {
                    if (await merge(suggestion)) {
                      onMerged();
                    }
                  }}
                  suggestion={suggestion}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <FlyBrainNote attributions={attributions} />
      </Stack>
    </Card>
  );
}
