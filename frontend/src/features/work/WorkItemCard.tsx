/* One task on My work, read like a position: title and badges, the one figure that matters for this business's side (its
   remainder on a task it won, the accepted or listed amount on one it posted), and the next step. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { categoryLabel } from '../../shared/format/categoryLabel';
import { formatMoneyText } from '../../shared/format/formatMoneyText';
import { cadenceSuffix, CategoryTile } from '../../shared/market';
import { Badge, ButtonLink, Icon } from '../../shared/ui';
import { originLabel, relationshipLabel, stateLabel } from '../tasks/labels/taskLabels';
import type { WorkItem } from '../tasks/types';

/** Render one work item card. */
export function WorkItemCard({ item }: { item: WorkItem }): JSX.Element {
  const origin = originLabel(item.origin);
  const state = stateLabel(item.state);
  const relationship = relationshipLabel(item.relationship);
  const unit = cadenceSuffix(item.billing_period);
  const figure = headline(item);

  return (
    <article className="work-item">
      <header className="work-item__heading">
        <CategoryTile category={item.category} />
        <div className="work-item__names">
          <h3 className="work-item__title">{item.title ?? categoryLabel(item.category)}</h3>
          <p className="work-item__subtitle">
            {counterpartyText(item)}
          </p>
        </div>
      </header>
      <div className="work-item__figure">
        <span className="work-item__label">{figure.label}</span>
        <span className="work-item__amount">
          {figure.amount === null ? <span className="ui-text-muted">—</span> : <MoneyDisplay amountMinor={figure.amount} currency={item.currency} />}
          <span className="work-item__period">{figure.amount === null ? '' : unit}</span>
        </span>
        {figure.caption ? <span className="work-item__caption">{figure.caption}</span> : null}
      </div>
      <div className="work-item__badges">
        <Badge tone={relationship.tone}>{relationship.text}</Badge>
        <Badge tone={state.tone}>{state.text}</Badge>
        <Badge tone={origin.tone}>{origin.text}</Badge>
        {item.is_subcontract ? <Badge tone="warning">Subcontract</Badge> : null}
        {item.offer_count > 0 ? <Badge icon={<Icon name="users" />} tone="neutral">{item.offer_count === 1 ? '1 offer' : `${item.offer_count} offers`}</Badge> : null}
      </div>
      <footer className="work-item__footer">
        {item.next_step ? <span className="work-item__next"><Icon name="arrow-right" size={14} /> {item.next_step}</span> : <span />}
        <ButtonLink size="sm" to={`/tasks/${item.task_id}`} variant="primary">Open task</ButtonLink>
      </footer>
    </article>
  );
}

interface Headline {
  label: string;
  amount: number | null;
  caption: string | null;
}

function headline(item: WorkItem): Headline {
  if (item.owner_money) {
    return {
      label: 'Your remainder',
      amount: item.owner_money.remainder_minor,
      caption: item.owner_money.potential_margin_minor === null ? null : `Potential margin ${formatMoneyText(item.owner_money.potential_margin_minor, item.currency)}`,
    };
  }
  const buyer = item.buyer_money;
  if (!buyer) {
    return { label: 'Amount', amount: null, caption: null };
  }
  const isAccepted = buyer.task_status === 'accepted';
  return {
    label: isAccepted ? 'Accepted price' : 'Listed price',
    amount: buyer.task_amount_minor,
    caption: isAccepted && buyer.potential_difference_minor !== null ? `${buyer.difference_label}: ${formatMoneyText(buyer.potential_difference_minor, item.currency)}` : null,
  };
}

function counterpartyText(item: WorkItem): string {
  if (item.owner_money?.client) {
    return `Client: ${item.owner_money.client.business_name}`;
  }
  if (item.buyer_money?.accepted_bidder) {
    return `Owned by ${item.buyer_money.accepted_bidder.business_name}`;
  }
  return categoryLabel(item.category);
}
