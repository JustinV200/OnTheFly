/* "Parent scope changed, review": the task this piece came from got a new scope version after the split. The piece is
   never rewritten; its poster reviews and clears the flag (plan2, "Flow-down and scope changes"). */
import { useState } from 'react';

import { ApiError, post } from '../../../shared/api/client';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { Button, Callout } from '../../../shared/ui';
import type { TaskDetail } from '../types';

interface ParentScopeNoticeProps {
  task: TaskDetail;
  onReviewed: () => void;
}

/** Render the review callout while the flag is set. */
export function ParentScopeNotice({ task, onReviewed }: ParentScopeNoticeProps): JSX.Element | null {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!task.parent_scope_changed_at) {
    return null;
  }

  const review = async (): Promise<void> => {
    setIsWorking(true);
    setError(null);
    try {
      await post(`/api/tasks/${task.id}/parent-scope-reviewed`);
      onReviewed();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.message);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Callout
      actions={<Button isBusy={isWorking} onClick={() => void review()} size="sm">Mark reviewed</Button>}
      role="alert"
      title="The task this piece came from changed its scope"
      tone="warning"
    >
      <p>
        Changed {formatTimestamp(task.parent_scope_changed_at)}. This piece and its offers are unchanged; check whether its
        requirements or cut still make sense.
      </p>
      {error ? <p>{error}</p> : null}
    </Callout>
  );
}
