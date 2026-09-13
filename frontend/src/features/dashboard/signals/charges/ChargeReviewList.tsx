/* Lists Mushroom Body novelty readings per charge, newest first, with unusual charges called out in words and an icon. */
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { Icon, joinClassNames } from '../../../../shared/ui';
import { formatPostedDate } from '../formatSignals';
import type { ChargeNovelty, ChargeStatus, NoveltyReason } from '../types';
import './ChargeReviewList.css';

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
  // Only an expense with no posted charges has none to score; say so rather than render an empty list.
  if (charges.length === 0) {
    return <p className="charge-review__empty">Charges not checked: no charge has posted, so there is nothing to compare.</p>;
  }

  // The backend returns oldest first (the order it learned them); owners scan newest first.
  const newestFirst = [...charges].reverse();

  return (
    <ul className="charge-review">
      {newestFirst.map((charge) => {
        const isUnusual = charge.status === 'unusual';
        return (
          <li className={joinClassNames('charge-review__item', isUnusual && 'charge-review__item--unusual')} key={charge.transaction_id}>
            <span className="charge-review__charge">
              {formatPostedDate(charge.posted_at)} · <MoneyDisplay amountMinor={charge.amount_minor} currency={charge.currency} />
              {charge.direction === 'credit' ? ' (credit)' : ''}
            </span>
            <span className="charge-review__status">
              {isUnusual ? <Icon className="charge-review__icon" name="alert-triangle" size={14} /> : null}
              <span>
                {STATUS_TEXT[charge.status]}
                {isUnusual && charge.reasons.length > 0
                  ? ` (${charge.reasons.map((reason) => REASON_TEXT[reason]).join('; ')})`
                  : ''}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
