/* The task's audited events the viewer may see, newest first: its own actions plus creation, acceptance and ownership
   changes. The audit trail is what makes "ownership moved" checkable, not just claimed. */
import { EmptyState } from '../../../shared/components/EmptyState';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { Card } from '../../../shared/ui';
import type { TaskEventView } from '../types';
import './TaskActivity.css';

/** Render the event list. */
export function TaskActivity({ events }: { events: TaskEventView[] }): JSX.Element {
  if (events.length === 0) {
    return <EmptyState title="No activity yet">Actions on this task are recorded here with who did them and when.</EmptyState>;
  }
  return (
    <Card title="Audit trail">
      <ol className="task-activity">
        {events.map((event) => (
          <li className="task-activity__item" key={`${event.kind}-${event.created_at}-${event.summary}`}>
            <span className="task-activity__summary">{event.summary}</span>
            <span className="task-activity__when">{formatTimestamp(event.created_at)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
