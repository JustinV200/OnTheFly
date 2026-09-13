/* The suggested pieces as hero cards, or, when none qualifies, a plain "No piece clears the thresholds on these numbers"
   with a manual split. The list is the focus target of the task page's "Ways to save" button: once cards load, it
   scrolls into view and takes focus, so that button always visibly does something. */
import { useRef } from 'react';

import { Button, Callout, Stack, useFocusOnRequest } from '../../../shared/ui';
import { HeroSavingsCard } from '../card/HeroSavingsCard';
import type { SavingsCardView } from '../types';
import './SuggestedPieces.css';

interface SuggestedPiecesProps {
  cards: SavingsCardView[];
  // Null when a suggestion can be split off; otherwise why not.
  splitBlockReason: string | null;
  canSplitManually: boolean;
  onSplitOff: (card: SavingsCardView) => void;
  onSplitManually: () => void;
  onDismiss: (card: SavingsCardView) => void;
  onOversightSaved: () => void;
  isFocusRequested: boolean;
  onFocusHandled: () => void;
}

/** Render the suggested pieces or the no-suggestion message. */
export function SuggestedPieces(props: SuggestedPiecesProps): JSX.Element {
  const { cards, splitBlockReason, canSplitManually, onSplitOff, onSplitManually, onDismiss, onOversightSaved } = props;
  const regionRef = useRef<HTMLDivElement>(null);
  useFocusOnRequest(regionRef, props.isFocusRequested, true, props.onFocusHandled);

  return (
    <div aria-label="Suggested pieces" className="suggested-pieces" ref={regionRef} role="region" tabIndex={-1}>
      {cards.length === 0 ? (
        <Callout
          actions={canSplitManually ? <Button onClick={onSplitManually} variant="primary">Split off manually</Button> : undefined}
          role="status"
          title="No piece clears the thresholds on these numbers"
          tone="info"
        >
          <p>Nothing here is cheaper to split off at the configured thresholds. You can still split off a piece by hand; the groups below say why each didn’t qualify.</p>
        </Callout>
      ) : (
        <Stack gap={4}>
          {cards.map((card) => (
            <HeroSavingsCard
              card={card}
              key={card.id}
              onDismiss={() => onDismiss(card)}
              onOversightSaved={onOversightSaved}
              onSplitOff={() => onSplitOff(card)}
              splitBlockReason={splitBlockReason}
            />
          ))}
        </Stack>
      )}
    </div>
  );
}
