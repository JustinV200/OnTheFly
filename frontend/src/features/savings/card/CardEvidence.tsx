/* The evidence behind a card, on demand: the rate sample and its matched categories, every award with its UEI, the sources
   that were not checked (listed, never omitted), each source's limitations, and the thresholds in force. Award links appear
   only when the source gave one; demo data has none, so no made-up award ever looks like a real record. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatMoneyText } from '../../../shared/format/formatMoneyText';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { Disclosure, Stack, Table } from '../../../shared/ui';
import type { SavingsCardView } from '../types';

/** Render the evidence disclosure for one card. */
export function CardEvidence({ card }: { card: SavingsCardView }): JSX.Element {
  const { cut_basis: rates, suppliers } = card.inputs;
  const { thresholds } = card;

  return (
    <Disclosure summary="Sources, awards and thresholds" variant="card">
      <Stack gap={4}>
        <section>
          <h5 className="savings-evidence__heading">Market rate ({rates.source}, {rates.status})</h5>
          <p className="ui-text-sm">
            {rates.median_minor === null
              ? 'No matching rate.'
              : <>Median {formatMoneyText(rates.median_minor, card.currency)}/h; 25th–75th percentile {formatMoneyText(rates.p25_minor ?? 0, card.currency)}–{formatMoneyText(rates.p75_minor ?? 0, card.currency)}/h from {rates.sample_size} rates.</>}
            {rates.matched_labor_categories.length > 0 ? ` Matched: ${rates.matched_labor_categories.join('; ')}.` : ''} Retrieved {formatTimestamp(rates.retrieved_at)}.
          </p>
          <p className="ui-text-xs ui-text-muted">{rates.limitations}</p>
        </section>

        <section>
          <h5 className="savings-evidence__heading">Awards ({suppliers.source}, {suppliers.status})</h5>
          <p className="ui-text-sm">
            PSC {suppliers.psc}, NAICS {suppliers.naics}, {suppliers.place_of_performance ?? 'any place of performance'}, last {suppliers.lookback_years} years.
            Subaward reporting is incomplete, so supplier counts are a floor.
          </p>
          {suppliers.awards.length > 0 ? (
            <Table density="compact" label="Awards behind this card" minWidth="520px">
              <thead>
                <tr><th>Award</th><th>Recipient</th><th>UEI</th><th className="ui-num">Amount</th></tr>
              </thead>
              <tbody>
                {suppliers.awards.map((award) => (
                  <tr key={award.award_id}>
                    <td>{award.url ? <a href={award.url} rel="noreferrer" target="_blank">{award.award_id}</a> : award.award_id} <span className="ui-text-xs ui-text-muted">{award.award_type}</span></td>
                    <td>{award.recipient_name}</td>
                    <td>{award.uei ?? <span className="ui-text-muted">none: not counted</span>}</td>
                    <td className="ui-num"><MoneyDisplay amountMinor={award.amount_minor} currency={award.currency} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <p className="ui-text-sm ui-text-muted">No award records.</p>}
          <p className="ui-text-xs ui-text-muted">{suppliers.limitations}</p>
        </section>

        <section>
          <h5 className="savings-evidence__heading">Not checked</h5>
          {card.sources_not_checked.length === 0
            ? <p className="ui-text-sm">Every source this card uses answered.</p>
            : <ul className="ui-text-sm">{card.sources_not_checked.map((item) => <li key={item}>{item}</li>)}</ul>}
        </section>

        <section>
          <h5 className="savings-evidence__heading">Thresholds used</h5>
          <p className="ui-text-sm">
            ≥ {(thresholds.min_basis_points / 100).toFixed(0)}% of keep cost · ≥ {formatMoneyText(thresholds.min_annual_minor, card.currency)} a year ·
            ≥ {thresholds.min_suppliers} suppliers by UEI · {thresholds.lookback_years}-year lookback · at most {thresholds.max_suggested_pieces_per_task} suggested pieces per task.
          </p>
        </section>
      </Stack>
    </Disclosure>
  );
}
