/* A task as one participant sees it (roadmap 12): who you are to it, the money view, and the actions that fit. The owner
   gets Ways to save, the split drawer, pieces and rates; the poster gets its listing and the offers to accept. It polls,
   so an offer or an acceptance made by another business shows up after switching back. Anyone else sees "not found". */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ButtonLink, Callout, Stack, TabItem, Tabs } from '../../shared/ui';
import { RatesPanel } from '../rates/RatesPanel';
import { WaysToSavePanel } from '../savings/WaysToSavePanel';
import { SplitDrawer } from '../split/SplitDrawer';
import type { SplitPrefill } from '../split/splitPrefill';
import { TaskActivity } from './activity/TaskActivity';
import { NextStepCallout } from './header/NextStepCallout';
import { ParentScopeNotice } from './header/ParentScopeNotice';
import { TaskHeader } from './header/TaskHeader';
import { TaskListingSection } from './listing/TaskListingSection';
import { BuyerMoney } from './money/BuyerMoney';
import { OwnerMoney } from './money/OwnerMoney';
import { TaskPieces } from './pieces/TaskPieces';
import { TaskRequirements } from './requirements/TaskRequirements';
import type { TaskDetail } from './types';

const POLL_INTERVAL_MS = 5000;

/** Render the task page for the acting business. */
export function TaskPage(): JSX.Element {
  const { id = '' } = useParams();
  const { account } = useActingAccount();
  const navigate = useNavigate();
  const query = useApiQuery<TaskDetail>(account ? `/api/tasks/${id}` : null, { pollIntervalMs: POLL_INTERVAL_MS });
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [splitPrefill, setSplitPrefill] = useState<SplitPrefill | null>(null);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

  const task = query.data;
  const isOwner = task.is_owned_by_you;
  const openSplit = (prefill: SplitPrefill | null): void => {
    setSplitPrefill(prefill);
    setIsSplitOpen(true);
  };
  const tabs: TabItem[] = [
    { id: 'money', label: 'Money', content: task.owner_money ? <OwnerMoney money={task.owner_money} /> : task.buyer_money ? <BuyerMoney money={task.buyer_money} /> : null },
    ...(isOwner ? [{ id: 'savings', label: 'Ways to save', content: <WaysToSavePanel canSplit={task.can_split} onSplitOff={openSplit} taskId={task.id} /> }] : []),
    { id: 'requirements', label: 'Requirements', meta: task.requirements.length, content: <TaskRequirements task={task} /> },
    { id: 'pieces', label: 'Pieces', meta: task.pieces.length, content: <TaskPieces onChanged={query.reload} onSplit={() => openSplit(null)} task={task} /> },
    ...(task.is_posted_by_you ? [{ id: 'listing', label: 'Listing & offers', meta: task.listing?.offer_count, content: <TaskListingSection onChanged={query.reload} task={task} /> }] : []),
    ...(isOwner ? [{
      id: 'rates',
      label: 'Your rates',
      content: (
        <RatesPanel
          kind={task.relationship === 'owner' ? 'internal_cost' : 'current_contract_rate'}
          laborCategories={uniqueCategories(task)}
          onChanged={query.reload}
        />
      ),
    }] : []),
    { id: 'activity', label: 'Activity', content: <TaskActivity events={task.events} /> },
  ];
  // The owner lands on Ways to save, the primary action on a task it owns (roadmap 12, step 9); a poster on its money.
  const defaultTab = isOwner && task.relationship === 'owner' ? 'savings' : task.is_posted_by_you && task.state !== 'accepted' ? 'listing' : 'money';

  return (
    <Stack gap={6}>
      <TaskHeader task={task} />
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} title="Showing the last loaded task; a refresh failed" /> : null}
      {notice ? <Callout role="status" title={notice} tone="success" /> : null}
      <ParentScopeNotice onReviewed={query.reload} task={task} />
      <NextStepCallout onOpenTab={setActiveTab} onSplit={() => openSplit(null)} task={task} />
      <Tabs activeId={activeTab ?? defaultTab} label="Task details" onChange={setActiveTab} tabs={tabs} />
      {isOwner ? (
        <SplitDrawer
          isOpen={isSplitOpen}
          onClose={() => setIsSplitOpen(false)}
          onSplit={(childTaskId) => {
            setIsSplitOpen(false);
            setNotice('Piece split off. It is private: confirm, preview and publish it from its own page.');
            navigate(`/tasks/${childTaskId}`);
          }}
          prefill={splitPrefill}
          task={task}
        />
      ) : null}
    </Stack>
  );
}

function uniqueCategories(task: TaskDetail): string[] {
  return Array.from(new Set(task.requirements.map((row) => row.labor_category).filter((value): value is string => Boolean(value))));
}
