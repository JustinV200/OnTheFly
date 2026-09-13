/* The way back to publishing a private listing, shared by the controls band and the no-offers state. A listing with a task
   opens that task, whose page holds its scope, exact preview and publish; only a category the older publish wizard still
   covers goes back to the wizard (publish/path). Neither link publishes anything by itself (CLAUDE.md, visibility). */
import { ButtonLink, ButtonSize } from '../../../shared/ui';
import { usesPublishWizard } from '../../publish/path/usesPublishWizard';
import type { PublicListingProjection } from '../../publish/types';
import type { InboxTaskSummary } from '../types';

interface RepublishLinkProps {
  listing: PublicListingProjection;
  task: InboxTaskSummary | null;
  size?: ButtonSize;
}

/** Render "Open task" or "Publish again…", or nothing when the listing has neither a task nor an expense to publish. */
export function RepublishLink({ listing, task, size = 'md' }: RepublishLinkProps): JSX.Element | null {
  const isWizard = listing.expense_id !== null && usesPublishWizard(listing.category);
  if (task && !isWizard) {
    return <ButtonLink size={size} to={`/tasks/${task.id}`}>Open task</ButtonLink>;
  }
  if (listing.expense_id) {
    return <ButtonLink size={size} to={`/publish?expense=${listing.expense_id}`}>Publish again…</ButtonLink>;
  }
  return null;
}
