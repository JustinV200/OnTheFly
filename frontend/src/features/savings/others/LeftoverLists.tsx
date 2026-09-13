/* The bottom of Ways to save: cards dismissed for this scope version (each restorable) and requirements that couldn't be
   priced because their tags aren't confirmed. Both are listed, never dropped, so the panel never looks more complete
   than it is. */
import { Button, Callout, Disclosure, Stack } from '../../../shared/ui';
import type { SavingsCardView, WaysToSaveResponse } from '../types';
import './OtherGroups.css';

interface LeftoverListsProps {
  dismissed: SavingsCardView[];
  untagged: WaysToSaveResponse['untagged_requirements'];
  onRestore: (card: SavingsCardView) => void;
}

/** Render the dismissed disclosure and the untagged callout, or nothing when both are empty. */
export function LeftoverLists({ dismissed, untagged, onRestore }: LeftoverListsProps): JSX.Element | null {
  if (dismissed.length === 0 && untagged.length === 0) {
    return null;
  }
  return (
    <Stack gap={4}>
      {dismissed.length > 0 ? (
        <Disclosure summary={`Dismissed for this scope version (${dismissed.length})`} variant="card">
          <ul className="other-groups__dismissed">
            {dismissed.map((card) => (
              <li key={card.id}>
                {card.labor_category} · {card.psc}
                <Button onClick={() => onRestore(card)} size="sm" variant="link">Restore</Button>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
      {untagged.length > 0 ? (
        <Callout role="note" title="Not priced: tags not confirmed" tone="neutral">
          <ul>{untagged.map((requirement) => <li key={requirement.key}>{requirement.text}</li>)}</ul>
        </Callout>
      ) : null}
    </Stack>
  );
}
