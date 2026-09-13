/* The card's arithmetic, read left to right: Keep cost − Suggested cut [− Oversight, once set] = Potential savings, with
   the percentage of keep cost. Every figure is the server's (costs.py computes savings = keep − cut − oversight); this
   only lays them out. A missing figure shows a dash and why, never zero. */
import type { ReactNode } from 'react';

import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatMoneyText } from '../../../../shared/format/formatMoneyText';
import { cadenceSuffix } from '../../../../shared/market';
import { TermHint } from '../../../../shared/ui';
import { MONEY_TERM_HINTS } from '../../glossary/moneyTerms';
import type { SavingsCardView } from '../../types';
import './figures.css';

interface SavingsEquationProps {
  card: SavingsCardView;
  // "lg" on a suggested piece's hero card; "sm" on the compact cards of other groups.
  size: 'lg' | 'sm';
}

/** Render the equation row. */
export function SavingsEquation({ card, size }: SavingsEquationProps): JSX.Element {
  const unit = cadenceSuffix(card.billing_period);
  const savings = card.modeled_savings_minor;
  const savingsTone = savings !== null && savings > 0 ? 'positive' : savings !== null && savings < 0 ? 'negative' : 'plain';
  const figure = (minor: number | null, missing: string): ReactNode => (minor === null
    ? <span className="savings-equation__missing">— {missing}</span>
    : <><MoneyDisplay amountMinor={minor} currency={card.currency} /><span className="savings-equation__unit">{unit}</span></>);

  return (
    <div aria-label="How potential savings are modeled" className={`savings-equation savings-equation--${size}`} role="group">
      <Term label={<TermHint hint={MONEY_TERM_HINTS.keepCost}>Keep cost</TermHint>} value={figure(card.keep_cost_minor, 'needs your rate')} />
      <Operator symbol="−" words="minus" />
      <Term label={<TermHint hint={MONEY_TERM_HINTS.suggestedCut}>Suggested cut</TermHint>} value={figure(card.suggested_cut_minor, 'no market rate')} />
      {card.oversight_minor !== null ? (
        <>
          <Operator symbol="−" words="minus" />
          <Term label={<TermHint hint={MONEY_TERM_HINTS.oversight}>Oversight</TermHint>} value={figure(card.oversight_minor, '')} />
        </>
      ) : null}
      <Operator symbol="=" words="equals" />
      <Term
        caption={savingsCaption(card)}
        label={<TermHint hint={MONEY_TERM_HINTS.potentialSavings}>Potential savings</TermHint>}
        tone={savingsTone}
        value={figure(savings, 'not computed')}
      />
    </div>
  );
}

function Term({ label, value, caption, tone = 'plain' }: { label: ReactNode; value: ReactNode; caption?: string | null; tone?: string }): JSX.Element {
  return (
    <div className={`savings-equation__term savings-equation__term--${tone}`}>
      <span className="savings-equation__label">{label}</span>
      <span className="savings-equation__value">{value}</span>
      {caption ? <span className="savings-equation__caption">{caption}</span> : null}
    </div>
  );
}

function Operator({ symbol, words }: { symbol: string; words: string }): JSX.Element {
  return (
    <span className="savings-equation__operator">
      <span aria-hidden="true">{symbol}</span>
      <span className="ui-visually-hidden">{words}</span>
    </span>
  );
}

function savingsCaption(card: SavingsCardView): string | null {
  const parts: string[] = [];
  if (card.modeled_savings_basis_points !== null) {
    parts.push(`${(card.modeled_savings_basis_points / 100).toFixed(1)}% of keep cost`);
  }
  // Only a non-annual task needs the annual figure spelled out; the server restated it (costs.py, annual_savings_minor).
  const isAnnual = ['annual', 'annually', 'yearly'].includes(card.billing_period);
  if (!isAnnual && card.annual_savings_minor !== null) {
    parts.push(`${formatMoneyText(card.annual_savings_minor, card.currency)} a year`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
