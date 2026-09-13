/* The top of a task page: back to My work, the task's title and category, and the facts a participant reads first:
   its origin and state, the viewer's own relationship to it, a Subcontract label, and its one direct counterparty. */
import { Link } from 'react-router-dom';

import { categoryLabel } from '../../../shared/format/categoryLabel';
import { CategoryTile } from '../../../shared/market';
import { Badge, Icon, PageHeader } from '../../../shared/ui';
import { originLabel, relationshipLabel, stateLabel } from '../labels/taskLabels';
import type { TaskDetail } from '../types';
import './TaskHeader.css';

interface TaskHeaderProps {
  task: TaskDetail;
}

/** Render the task page header with its h1. */
export function TaskHeader({ task }: TaskHeaderProps): JSX.Element {
  const origin = originLabel(task.origin);
  const state = stateLabel(task.state);
  const relationship = relationshipLabel(task.relationship);
  const counterparty = task.owner_money?.client ?? task.buyer_money?.accepted_bidder ?? null;

  return (
    <div className="task-header">
      <Link className="task-header__back" to="/work">
        <Icon name="arrow-left" size={14} />
        My work
      </Link>
      <div className="task-header__main">
        <CategoryTile category={task.category} size="lg" />
        <PageHeader
          meta={(
            <>
              <Badge size="md" title={relationship.explanation} tone={relationship.tone}>{relationship.text}</Badge>
              <Badge title={state.explanation} tone={state.tone}>{state.text}</Badge>
              <Badge title={origin.explanation} tone={origin.tone}>{origin.text}</Badge>
              {task.is_subcontract ? (
                <Badge icon={<Icon name="users" />} title="Split off a task its poster won: payment depends on the business above." tone="warning">
                  Subcontract
                </Badge>
              ) : null}
              {task.depth > 0 ? <Badge tone="neutral">Level {task.depth}</Badge> : null}
            </>
          )}
          subtitle={(
            <span className="task-header__subtitle">
              {categoryLabel(task.category)} · priced per {task.billing_period} period in {task.currency}
              {counterparty ? (
                <>
                  {' · '}
                  {counterparty.role === 'client' ? 'Client: ' : 'Owned by '}
                  <Link to={`/p/${counterparty.handle}`}>{counterparty.business_name}</Link>
                  {counterparty.role === 'client' ? '' : ' (accepted offer)'}
                </>
              ) : null}
            </span>
          )}
          title={task.title ?? categoryLabel(task.category)}
        />
      </div>
    </div>
  );
}
