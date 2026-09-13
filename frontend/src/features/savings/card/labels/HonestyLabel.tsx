/* A card's honesty label, always on the card itself and never behind a click: "Modeled cut from demo market data — not an
   offer" or "Modeled cut from public pricing — not an offer". The words are the server's (savings/view.py card_label);
   the simulated tone marks demo data, per the design system, and public evidence keeps a neutral tone. */
import type { SavingsCardView } from '../../types';
import './labels.css';

/** Render the label for one card. */
export function HonestyLabel({ card }: { card: SavingsCardView }): JSX.Element {
  const isDemo = card.inputs.cut_basis.provenance === 'demo_data' || card.inputs.suppliers.provenance === 'demo_data';
  return <p className={isDemo ? 'savings-label savings-label--demo' : 'savings-label'}>{card.label}</p>;
}
