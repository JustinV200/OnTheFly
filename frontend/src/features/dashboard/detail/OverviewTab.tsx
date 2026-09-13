/* The Overview tab of an expense: annual cost first, the sentence saying how the baseline was observed, then pattern,
   visibility, and where the figures came from. Every value is the backend's; nothing is recomputed here. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Callout, Stack, Stat } from '../../../shared/ui';
import { describePattern } from '../expenses/row/describePattern';
import { perPeriodLabel } from '../expenses/row/perPeriodLabel';
import type { Expense } from '../types';
import { notPublishableReason } from '../visibility/notPublishableReason';
import { expenseVisibility } from '../visibility/expenseVisibility';
import { VisibilityBadge } from '../visibility/VisibilityBadge';
import './OverviewTab.css';

interface OverviewTabProps {
  expense: Expense;
}

/** Render the expense's headline figure, baseline sentence, and facts. */
export function OverviewTab({ expense }: OverviewTabProps): JSX.Element {
  const pattern = describePattern(expense);

  return (
    <Stack gap={5}>
      <Stat
        caption={
          <span>
            <MoneyDisplay amountMinor={expense.amount_minor_per_period} currency={expense.currency} />{' '}
            {perPeriodLabel(expense.cadence, expense.period_count)}
          </span>
        }
        label="Annual cost"
        size="lg"
        unit="/ yr"
        value={<MoneyDisplay amountMinor={expense.annualized_amount_minor} currency={expense.currency} />}
      />

      <p className="expense-overview__lead">
        Baseline <MoneyDisplay amountMinor={expense.amount_minor_per_period} currency={expense.currency} /> per {expense.cadence}{' '}
        period from {expense.period_count} {expense.period_count === 1 ? 'payment' : 'payments'},{' '}
        {formatTimestamp(expense.first_seen, { dateOnly: true })} to {formatTimestamp(expense.last_seen, { dateOnly: true })},
        annualized to <MoneyDisplay amountMinor={expense.annualized_amount_minor} currency={expense.currency} />.
      </p>

      <dl className="expense-overview__facts">
        <div className="expense-overview__fact">
          <dt>Pattern</dt>
          <dd>
            <span>
              <span className="expense-overview__rhythm" title={pattern.tooltip}>{pattern.rhythm}</span> · {pattern.detail}
            </span>
          </dd>
        </div>
        <div className="expense-overview__fact">
          <dt>Visibility</dt>
          <dd>
            <VisibilityBadge size="sm" visibility={expenseVisibility(expense)} />
            <span className="ui-text-sm ui-text-muted">
              {expense.visibility === 'public'
                ? 'Strangers see the listing, never these transactions.'
                : 'Nobody outside your business can see it.'}
            </span>
          </dd>
        </div>
        <div className="expense-overview__fact">
          <dt>Source</dt>
          <dd>{expense.provenance.map((value) => <ProvenanceBadge key={value} kind="financial" value={value} />)}</dd>
        </div>
      </dl>

      {expense.is_publishable ? null : (
        <Callout role="note" tone="private">{notPublishableReason(expense.eligibility_reason)}. It stays private.</Callout>
      )}
    </Stack>
  );
}
