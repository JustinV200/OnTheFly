/* The top of a task page: back to My work, the task's title and category, the facts a participant reads first (its
   origin and state, the viewer's own relationship to it, a Subcontract label), and the ownership line saying who owns it
   now and who its one direct counterparty is. */
import { Link } from 'react-router-dom';

import { categoryLabel } from '../../../shared/format/categoryLabel';
import { CategoryTile } from '../../../shared/market';
import { Badge, Icon, PageHeader } from '../../../shared/ui';
import { originLabel, relationshipLabel, stateLabel } from '../labels/taskLabels';
import type { TaskDetail } from '../types';
import { OwnershipLine } from './OwnershipLine';
import './TaskHeader.css';

interface TaskHeaderProps {
  task: TaskDetail;
}

/** Render the task page header with its h1. */
export function TaskHeader({ task }: TaskHeaderProps): JSX.Element {
  const origin = originLabel(task.origin);
  const state = stateLabel(task.state);
  const relationship = relationshipLabel(task.relationship);

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
            </span>
          )}
          title={task.title ?? categoryLabel(task.category)}
        />
      </div>
      <OwnershipLine task={task} />
    </div>
  );
}
