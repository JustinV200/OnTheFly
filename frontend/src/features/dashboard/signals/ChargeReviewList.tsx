/* Lists Mushroom Body novelty readings per charge, newest first, with unusual charges called out. */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatPostedDate } from './formatSignals';
import type { ChargeNovelty, ChargeStatus, NoveltyReason } from './types';

interface ChargeReviewListProps {
  charges: ChargeNovelty[];
}

const STATUS_TEXT: Record<ChargeStatus, string> = {
  not_enough_history: 'Not enough earlier charges to compare',
  no_stable_pattern: 'Not judged: this vendor has no stable pattern',
  typical: 'Looks like earlier charges',
  unusual: 'Unusual: review before publishing',
};

const REASON_TEXT: Record<NoveltyReason, string> = {
  amount_unlike_earlier_charges: 'amount unlike earlier charges',
  description_unlike_earlier_charges: 'description unlike earlier charges',
};

/** Render one row per charge with its status and, for unusual charges, the reasons. */
export function ChargeReviewList({ charges }: ChargeReviewListProps): JSX.Element {
  // The backend returns oldest first (the order it learned them); owners scan newest first.
  const newestFirst = [...charges].reverse();

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {newestFirst.map((charge) => {
        const isUnusual = charge.status === 'unusual';
        return (
          <li
            key={charge.transaction_id}
            style={{
              alignItems: 'baseline',
              backgroundColor: isUnusual ? '#fef2f2' : 'transparent',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              justifyContent: 'space-between',
              padding: '0.4rem 0.25rem',
            }}
          >
            <span>
              {formatPostedDate(charge.posted_at)} · <MoneyDisplay amountMinor={charge.amount_minor} currency={charge.currency} />
              {charge.direction === 'credit' ? ' (credit)' : ''}
            </span>
            <span style={{ color: isUnusual ? '#991b1b' : '#475569', fontWeight: isUnusual ? 600 : 400 }}>
              {STATUS_TEXT[charge.status]}
              {isUnusual && charge.reasons.length > 0
                ? ` (${charge.reasons.map((reason) => REASON_TEXT[reason]).join('; ')})`
                : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
