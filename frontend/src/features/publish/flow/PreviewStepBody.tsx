/* What step 2 shows in each state: preparing, a fresh preview, cleared by an edit, or not requested yet.
   It never shows a stale payload: the hook drops the preview on any edit, and this only renders what the hook holds. */
import { EmptyState } from '../../../shared/components/EmptyState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { PublishPreview } from '../preview/PublishPreview';
import type { ListingPreviewResponse } from '../types';

interface PreviewStepBodyProps {
  preview: ListingPreviewResponse | null;
  isDrafting: boolean;
  hasShownPreview: boolean;
}

/** Render the preview, or a state that says why there isn't one. */
export function PreviewStepBody({ preview, isDrafting, hasShownPreview }: PreviewStepBodyProps): JSX.Element {
  if (isDrafting) {
    return <LoadingSpinner label="Preparing the preview of your public listing…" />;
  }
  if (preview) {
    return <PublishPreview preview={preview} />;
  }
  if (hasShownPreview) {
    return (
      <EmptyState title="Preview cleared">
        The earlier preview was discarded because the form changed or a new preview was requested. Preview again to see exactly what
        would go public.
      </EmptyState>
    );
  }
  return (
    <EmptyState title="No preview yet">
      Finish step 1 and choose “Preview exactly what goes public”. The literal payload appears here, field for field, before anything is
      published.
    </EmptyState>
  );
}
