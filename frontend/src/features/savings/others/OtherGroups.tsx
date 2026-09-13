/* Every priced group that isn't a suggestion, collapsed into one disclosure with counts, so the panel leads with what to
   do. Expanded, groups are listed by tier as compact cards whose pass lines show what failed. Nothing is hidden for good:
   one click shows every card, and each keeps its honesty label and thresholds. */
import { Disclosure, Stack } from '../../../shared/ui';
import { CompactSavingsCard } from '../card/CompactSavingsCard';
import { tierWords } from '../card/tierWords';
import type { SavingsCardView } from '../types';
import { OTHER_TIER_ORDER, otherGroupsSummary } from './otherGroupsSummary';
import './OtherGroups.css';

interface OtherGroupsProps {
  cards: SavingsCardView[];
  hasSuggestions: boolean;
  canSplit: boolean;
  onSplitOff: (card: SavingsCardView) => void;
  onDismiss: (card: SavingsCardView) => void;
  onOversightSaved: () => void;
}

/** Render the collapsed other groups, or nothing when there are none. */
export function OtherGroups({ cards, hasSuggestions, canSplit, onSplitOff, onDismiss, onOversightSaved }: OtherGroupsProps): JSX.Element | null {
  if (cards.length === 0) {
    return null;
  }
  // Tiers the panel doesn't know yet still appear, after the known ones, rather than vanishing.
  const unknown = cards.filter((card) => !OTHER_TIER_ORDER.includes(card.tier));
  const groups = [
    ...OTHER_TIER_ORDER.map((tier) => ({ tier: tier as string, cards: cards.filter((card) => card.tier === tier) })),
    ...(unknown.length > 0 ? [{ tier: 'other', cards: unknown }] : []),
  ].filter((group) => group.cards.length > 0);

  return (
    <Disclosure summary={otherGroupsSummary(cards, hasSuggestions)} variant="card">
      <Stack gap={5}>
        {groups.map((group) => (
          <section aria-label={tierWords(group.tier).badge} className="other-groups__group" key={group.tier}>
            <h4 className="other-groups__heading">{tierWords(group.tier).badge} ({group.cards.length})</h4>
            <div className="other-groups__cards">
              {group.cards.map((card) => (
                <CompactSavingsCard
                  canSplit={canSplit}
                  card={card}
                  key={card.id}
                  onDismiss={() => onDismiss(card)}
                  onOversightSaved={onOversightSaved}
                  onSplitOff={() => onSplitOff(card)}
                />
              ))}
            </div>
          </section>
        ))}
      </Stack>
    </Disclosure>
  );
}
