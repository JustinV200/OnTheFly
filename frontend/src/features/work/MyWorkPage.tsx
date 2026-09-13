/* My work (roadmap 12, step 10): the tasks this business won through accepted offers, and the tasks it posted, each with its
   own money view and next step. Only the acting business's own figures and direct counterparties appear here. */
import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Badge, ButtonLink, Icon, PageHeader, Stack } from '../../shared/ui';
import type { WorkResponse } from '../tasks/types';
import { WorkItemCard } from './WorkItemCard';
import './MyWorkPage.css';

const POLL_INTERVAL_MS = 5000;

/** Render My work for the acting business. */
export function MyWorkPage(): JSX.Element {
  const { account } = useActingAccount();
  const work = useApiQuery<WorkResponse>(account ? '/api/work' : null, { pollIntervalMs: POLL_INTERVAL_MS });

  if (!account) {
    return (
      <Stack gap={5}>
        <PageHeader title="My work" />
        <EmptyState action={<ButtonLink to="/marketplace">Browse markets</ButtonLink>} title="Pick a business to see its work">
          My work lists the tasks a business won or posted. Choose one in the account menu.
        </EmptyState>
      </Stack>
    );
  }

  return (
    <Stack gap={6}>
      <PageHeader
        actions={<ButtonLink iconStart={<Icon name="plus" />} to="/tasks/new" variant="primary">Post new work</ButtonLink>}
        meta={<Badge icon={<Icon name="lock" />} size="md" tone="private">Only {account.businessName} can see this page</Badge>}
        subtitle="Tasks you won through an accepted offer, and tasks you posted. Figures are yours alone: nothing here names a business two steps away."
        title="My work"
      />
      {!work.data ? (
        work.error ? <ErrorState error={work.error} onRetry={work.reload} title="Couldn’t load your work" /> : <LoadingSpinner label="Loading your work…" />
      ) : (
        <>
          <section aria-labelledby="work-owned" className="my-work__section">
            <h2 className="my-work__heading" id="work-owned">Tasks you won ({work.data.owned.length})</h2>
            {work.data.owned.length === 0 ? (
              <p className="ui-text-muted">None yet. Win a task by bidding on the market board; when its poster accepts your offer, it lands here and you can split it.</p>
            ) : (
              <ul className="my-work__list">
                {work.data.owned.map((item) => <li key={item.task_id}><WorkItemCard item={item} /></li>)}
              </ul>
            )}
          </section>
          <section aria-labelledby="work-posted" className="my-work__section">
            <h2 className="my-work__heading" id="work-posted">Tasks you posted ({work.data.posted.length})</h2>
            {work.data.posted.length === 0 ? (
              <p className="ui-text-muted">Nothing posted yet. REBID an expense from Spend, post new work, or split a piece off a task you won.</p>
            ) : (
              <ul className="my-work__list">
                {work.data.posted.map((item) => <li key={item.task_id}><WorkItemCard item={item} /></li>)}
              </ul>
            )}
          </section>
        </>
      )}
    </Stack>
  );
}
