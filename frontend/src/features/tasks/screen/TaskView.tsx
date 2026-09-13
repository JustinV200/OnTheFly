/* A loaded task as one participant sees it (roadmap 12): the header with who owns it, the result of the last action, the
   next step with a button that performs it, and the tabs. Holds the page's interaction state (active tab, notice,
   drawers, focus requests); the page mounts it per task id, so none of that carries over to another task. */
import { useCallback, useState } from 'react';

import type { ApiError } from '../../../shared/api/client';
import { ErrorState } from '../../../shared/components/ErrorState';
import { Stack, Tabs } from '../../../shared/ui';
import { SplitDrawer } from '../../split/SplitDrawer';
import { ParentScopeNotice } from '../header/ParentScopeNotice';
import { TaskHeader } from '../header/TaskHeader';
import { nextStep } from '../nextStep/nextStep';
import { NextStepCallout, StepHandlers } from '../nextStep/NextStepCallout';
import type { TaskNotice } from '../notices/taskNotice';
import { TaskNoticeCallout } from '../notices/TaskNoticeCallout';
import { TaskPublishDrawer } from '../publish/TaskPublishDrawer';
import type { TaskDetail } from '../types';
import { buildTaskTabs, FocusTarget } from './buildTaskTabs';
import { defaultTabId } from './defaultTabId';
import { useSplitFlow } from './useSplitFlow';

interface TaskViewProps {
  task: TaskDetail;
  reload: () => void;
  // A failed background refresh while the last loaded task stays on screen.
  refreshError: ApiError | null;
}

/** Render the task page for a loaded task. */
export function TaskView({ task, reload, refreshError }: TaskViewProps): JSX.Element {
  // Null follows the default for the task's current state until the viewer (or an action) picks a tab.
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [notice, setNotice] = useState<TaskNotice | null>(null);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const [highlightedPieceId, setHighlightedPieceId] = useState<string | null>(null);
  const clearFocus = useCallback(() => setFocusTarget(null), []);

  // After a split the page stays on this task and switches to Overview, so the owner sees its remainder drop.
  const split = useSplitFlow(task, (splitNotice, childTaskId) => {
    setNotice(splitNotice);
    setHighlightedPieceId(childTaskId);
    setActiveTab('overview');
    reload();
  });

  const step = nextStep(task);
  const handlers: StepHandlers = {
    onPublish: () => setIsPublishOpen(true),
    onReviewOffers: () => {
      setActiveTab('listing');
      setFocusTarget('offers');
    },
    onWaysToSave: () => {
      setActiveTab('savings');
      setFocusTarget('savings');
    },
    onSplitManually: () => split.open(null),
  };

  const tabs = buildTaskTabs({
    task,
    reload,
    openSplit: split.open,
    openPublish: () => setIsPublishOpen(true),
    isPublishInCallout: step?.primary?.kind === 'publish',
    onAccepted: (bidderName) => {
      setNotice({ kind: 'accepted', bidderName });
      setHighlightedPieceId(null);
      setActiveTab('overview');
      reload();
    },
    highlightedPieceId,
    focusTarget,
    clearFocus,
  });

  return (
    <Stack gap={6}>
      <TaskHeader task={task} />
      {refreshError ? <ErrorState error={refreshError} onRetry={reload} title="Showing the last loaded task; a refresh failed" /> : null}
      <TaskNoticeCallout notice={notice} onDismiss={() => setNotice(null)} />
      <ParentScopeNotice onReviewed={reload} task={task} />
      {/* A split notice already carries the next step (open the piece to publish); repeating it would add a second primary. */}
      {notice?.kind === 'split' ? null : <NextStepCallout handlers={handlers} step={step} />}
      <Tabs
        activeId={activeTab ?? defaultTabId(task)}
        label="Task details"
        onChange={(id) => {
          setActiveTab(id);
          setFocusTarget(null);
        }}
        tabs={tabs}
      />
      {task.is_posted_by_you ? (
        <TaskPublishDrawer
          isOpen={isPublishOpen}
          onClose={() => setIsPublishOpen(false)}
          onPublished={() => {
            setNotice({ kind: 'published', listingId: task.listing?.id ?? null });
            reload();
          }}
          task={task}
        />
      ) : null}
      {task.is_owned_by_you ? (
        <SplitDrawer isOpen={split.isOpen} onClose={split.close} onSplit={split.handleSplit} prefill={split.prefill} task={task} />
      ) : null}
    </Stack>
  );
}
