/* Loads one task for the acting business and handles the states before there is a task to show: no business picked,
   "not yours to see" (anyone but its poster and owner gets 404, which is how a client never sees its owner's pieces),
   loading and a failed first load. It polls, so an offer or an acceptance made by another business shows up. */
import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../../shared/api/useApiQuery';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { ButtonLink } from '../../../shared/ui';
import type { TaskDetail } from '../types';
import { TaskView } from './TaskView';

const POLL_INTERVAL_MS = 5000;

/** Render the task with the given id, or the state that stands in for it. */
export function TaskScreen({ taskId }: { taskId: string }): JSX.Element {
  const { account } = useActingAccount();
  const query = useApiQuery<TaskDetail>(account ? `/api/tasks/${taskId}` : null, { pollIntervalMs: POLL_INTERVAL_MS });

  if (!account) {
    return (
      <EmptyState action={<ButtonLink to="/marketplace">Browse markets</ButtonLink>} title="Pick a business to see its tasks">
        A task is visible only to the business that posted it and the business that owns it. Choose one in the account menu.
      </EmptyState>
    );
  }
  if (query.error?.status === 404) {
    return (
      <EmptyState action={<ButtonLink to="/work">Go to My work</ButtonLink>} title="This task isn’t yours to see">
        Only a task’s poster and its current owner can open it. {account.businessName} is neither, which is how a client never
        sees the pieces its task owner splits off.
      </EmptyState>
    );
  }
  if (!query.data) {
    return query.error ? <ErrorState error={query.error} onRetry={query.reload} title="Couldn’t load this task" /> : <LoadingSpinner label="Loading task…" />;
  }
  return <TaskView refreshError={query.error} reload={query.reload} task={query.data} />;
}
