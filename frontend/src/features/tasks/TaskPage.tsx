/* The /tasks/:id route. It mounts the task screen keyed by the id, so moving from a task to one of its pieces (or back)
   starts fresh: the active tab, a success notice and open drawers belong to the task they were about, never the next. */
import { useParams } from 'react-router-dom';

import { TaskScreen } from './screen/TaskScreen';

/** Render the task page for the id in the URL. */
export function TaskPage(): JSX.Element {
  const { id = '' } = useParams();
  return <TaskScreen key={id} taskId={id} />;
}
