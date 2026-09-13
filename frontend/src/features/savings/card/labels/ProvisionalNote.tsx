/* "Provisional — oversight cost not set": says why a card's figures can still move, from the card's own API fields
   (costs.py marks a card provisional when oversight is unset or any hours are still an estimate). Renders nothing when
   the card is final. */
import { TermHint } from '../../../../shared/ui';
import { MONEY_TERM_HINTS } from '../../glossary/moneyTerms';
import type { SavingsCardView } from '../../types';
import './labels.css';

/** Render the provisional note, or nothing. */
export function ProvisionalNote({ card }: { card: SavingsCardView }): JSX.Element | null {
  if (!card.is_provisional) {
    return null;
  }
  const causes: string[] = [];
  if (card.oversight_minor === null) {
    causes.push('oversight cost not set');
  }
  if (card.inputs.requirements.some((requirement) => requirement.hours_status !== 'confirmed')) {
    causes.push('hours are estimates');
  }
  return (
    <p className="savings-provisional">
      <TermHint hint={MONEY_TERM_HINTS.provisional}>Provisional</TermHint>
      {causes.length > 0 ? ` — ${causes.join('; ')}` : ''}
    </p>
  );
}
