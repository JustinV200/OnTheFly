/* The task page's tabs, at most four: Overview (money and pieces, the story), Ways to save (owner only), Listing & offers
   (poster only), and Details (requirements, rates, activity). Content is built here; the page owns the state it wires in. */
import type { TabItem } from '../../../shared/ui';
import { WaysToSavePanel } from '../../savings/WaysToSavePanel';
import type { SplitPrefill } from '../../split/splitPrefill';
import { TaskDetails } from '../details/TaskDetails';
import { TaskListingSection } from '../listing/TaskListingSection';
import { TaskOverview } from '../overview/TaskOverview';
import type { TaskDetail } from '../types';

export type FocusTarget = 'offers' | 'savings' | null;

interface TaskTabsInput {
  task: TaskDetail;
  reload: () => void;
  openSplit: (prefill: SplitPrefill | null) => void;
  openPublish: () => void;
  isPublishInCallout: boolean;
  onAccepted: (bidderName: string) => void;
  highlightedPieceId: string | null;
  focusTarget: FocusTarget;
  clearFocus: () => void;
}

/** Return the tabs the viewer may see, in page order. */
export function buildTaskTabs(input: TaskTabsInput): TabItem[] {
  const { task, reload, openSplit, focusTarget, clearFocus } = input;
  const tabs: TabItem[] = [{
    id: 'overview',
    label: 'Overview',
    meta: task.pieces.length > 0 ? task.pieces.length : undefined,
    content: <TaskOverview highlightedPieceId={input.highlightedPieceId} onChanged={reload} onSplit={() => openSplit(null)} task={task} />,
  }];

  if (task.is_owned_by_you) {
    tabs.push({
      id: 'savings',
      label: 'Ways to save',
      content: (
        <WaysToSavePanel
          canSplit={task.can_split}
          isFocusRequested={focusTarget === 'savings'}
          onFocusHandled={clearFocus}
          onSplitManually={() => openSplit(null)}
          onSplitOff={openSplit}
          requirementCount={task.requirements.length}
          splitBlockReason={task.split_block_reason}
          taskId={task.id}
        />
      ),
    });
  }

  if (task.is_posted_by_you) {
    tabs.push({
      id: 'listing',
      label: 'Listing & offers',
      meta: task.listing?.offer_count,
      content: (
        <TaskListingSection
          isOffersFocusRequested={focusTarget === 'offers'}
          isPublishInCallout={input.isPublishInCallout}
          onAccepted={input.onAccepted}
          onChanged={reload}
          onOffersFocusHandled={clearFocus}
          onPublish={input.openPublish}
          task={task}
        />
      ),
    });
  }

  tabs.push({ id: 'details', label: 'Details', content: <TaskDetails onChanged={reload} task={task} /> });
  return tabs;
}
