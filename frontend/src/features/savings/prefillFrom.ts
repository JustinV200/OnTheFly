/* Builds what a Ways to save card hands the split drawer: its requirements, its suggested cut (the server's figure), a
   title, the honesty label and the interquartile range in words. Only a potential_savings card is a suggestion. */
import { formatMoneyText } from '../../shared/format/formatMoneyText';
import type { SplitPrefill } from '../split/splitPrefill';
import type { SavingsCardView } from './types';

/** Return the split drawer prefill for one card. */
export function prefillFrom(card: SavingsCardView): SplitPrefill {
  // The range is the useful sentence; the honesty label travels separately so the drawer prints each fact once.
  const cutRangeText = card.suggested_cut_low_minor !== null && card.suggested_cut_high_minor !== null
    ? `Market rates put the same hours between ${formatMoneyText(card.suggested_cut_low_minor, card.currency)} and ${formatMoneyText(card.suggested_cut_high_minor, card.currency)} (25th–75th percentile).`
    : null;
  return {
    savingsCardId: card.id,
    isSuggestion: card.tier === 'potential_savings',
    requirementKeys: card.inputs.requirements.map((requirement) => requirement.key),
    // No suggested cut (no market rate matched) leaves the drawer's cut at zero for the owner to type in.
    cutMinor: card.suggested_cut_minor ?? 0,
    title: card.inputs.requirements.length === 1 ? card.inputs.requirements[0].text : `${card.labor_category} work`,
    label: card.label,
    // The same test HonestyLabel uses, so the drawer tones the label exactly as the card did.
    isLabelDemoData: card.inputs.cut_basis.provenance === 'demo_data' || card.inputs.suppliers.provenance === 'demo_data',
    cutRangeText,
  };
}
