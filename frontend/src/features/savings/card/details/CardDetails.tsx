/* "How we got this": everything behind a card's figures, one click away. Hours per requirement and whether each is
   confirmed or an estimate, the owner's rate and the market rate it was compared with, the owner's oversight cost (set
   here), supplier and award counts, then the full evidence. The honesty label is never in here; it stays on the card. */
import { formatMoneyText } from '../../../../shared/format/formatMoneyText';
import { perPeriodWords } from '../../../../shared/market';
import { Badge, Disclosure, Stack, TermHint } from '../../../../shared/ui';
import { MONEY_TERM_HINTS } from '../../glossary/moneyTerms';
import type { SavingsCardView } from '../../types';
import { CardEvidence } from './CardEvidence';
import { OversightControl } from './OversightControl';
import './details.css';

interface CardDetailsProps {
  card: SavingsCardView;
  onOversightSaved: () => void;
}

/** Render the card's details disclosure. */
export function CardDetails({ card, onOversightSaved }: CardDetailsProps): JSX.Element {
  const suppliers = card.inputs.suppliers.count;
  const market = card.inputs.cut_basis;

  return (
    <Disclosure summary="How we got this" variant="card">
      <Stack gap={4}>
        <section>
          <h5 className="savings-details__heading">
            Hours{card.hours_total === null ? ' (some unanswered)' : `: ${card.hours_total.toLocaleString('en-US')} ${perPeriodWords(card.billing_period)}`}
          </h5>
          <ul className="savings-details__list">
            {card.inputs.requirements.map((requirement) => (
              <li key={requirement.key}>
                {requirement.text}: {requirement.hours === null ? 'unanswered' : `${requirement.hours.toLocaleString('en-US')} h`}{' '}
                {requirement.hours_status === 'confirmed' ? <Badge tone="success">Confirmed</Badge> : <Badge tone="warning">Estimate</Badge>}
              </li>
            ))}
          </ul>
          <p className="ui-text-xs ui-text-muted">Keep cost and the suggested cut use the same hours.</p>
        </section>

        <section>
          <h5 className="savings-details__heading">Rates</h5>
          <p className="ui-text-sm">
            Yours: {ownRateText(card)}. Market median:{' '}
            {market.median_minor === null ? `none matched (${market.status})` : `${formatMoneyText(market.median_minor, card.currency)}/h from ${market.sample_size} rates (${market.source})`}.
          </p>
        </section>

        <section>
          <h5 className="savings-details__heading"><TermHint hint={MONEY_TERM_HINTS.oversight}>Oversight cost</TermHint></h5>
          <OversightControl card={card} onSaved={onOversightSaved} />
        </section>

        <section>
          <h5 className="savings-details__heading">Suppliers</h5>
          <p className="ui-text-sm">
            {suppliers.distinct_uei_count} distinct supplier{suppliers.distinct_uei_count === 1 ? '' : 's'} by UEI · {suppliers.award_count} award
            {suppliers.award_count === 1 ? '' : 's'} ({suppliers.prime_award_count} prime, {suppliers.subaward_count} sub)
            {suppliers.records_without_uei > 0 ? ` · ${suppliers.records_without_uei} without a UEI, not counted` : ''}
          </p>
        </section>

        <CardEvidence card={card} />
      </Stack>
    </Disclosure>
  );
}

function ownRateText(card: SavingsCardView): string {
  const rate = card.inputs.rate;
  if (rate.rate_minor_per_hour === null) {
    return `no rate for ${rate.labor_category}`;
  }
  const kind = rate.kind === 'current_contract_rate' ? 'your contract rate' : 'your internal cost';
  const provenance = rate.provenance === 'fixture' ? ', fixture · demo data' : '';
  return `${formatMoneyText(rate.rate_minor_per_hour, card.currency)}/h (${kind}${provenance})`;
}
