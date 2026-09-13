/* Reports how the last demo import went: a failure with what did not change, or the counts of what arrived.
   Both say that nothing was published, because importing must never read as a disclosure. */
import { ErrorState } from '../../../shared/components/ErrorState';
import { Callout } from '../../../shared/ui';
import type { ImportState } from './types';

interface ImportOutcomeNoticeProps {
  importState: ImportState;
}

/** Render the failed or succeeded import notice; nothing while idle or running (the button shows progress). */
export function ImportOutcomeNotice({ importState }: ImportOutcomeNoticeProps): JSX.Element | null {
  if (importState.phase === 'failed') {
    return (
      <ErrorState error={null} title="Import failed">
        <p>{importState.message}</p>
        <p>Nothing was published. Previously imported expenses are unchanged.</p>
      </ErrorState>
    );
  }
  if (importState.phase === 'succeeded') {
    const { result } = importState;
    return (
      <Callout role="status" title="Import complete" tone="success">
        <p>
          {result.new} new, {result.duplicate} already imported, {result.excluded} excluded, {result.failed} failed.
          Everything imported is private.
        </p>
      </Callout>
    );
  }
  return null;
}
