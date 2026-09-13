/* Owns the invite page's write actions and their busy/error state: discover, add, remove, preview, approve, retry.
   Every successful write reloads the overview, so the page always renders what the server stored, never a guess. */
import { useCallback, useState } from 'react';

import { ApiError } from '../../shared/api/client';
import { addCandidate, approveInvitations, previewInvitations, removeCandidate, retryQueue, runDiscovery } from './outreachApi';
import type { ApproveInvitationsResponse, InvitationPreview, NewCandidate } from './types';

export type OutreachBusy = 'discover' | 'preview' | 'approve' | 'retry' | null;

export interface OutreachActions {
  busy: OutreachBusy;
  removingId: string | null;
  // The last failed action outside the approval drawer, with a title for it.
  actionError: { title: string; error: ApiError } | null;
  approveError: ApiError | null;
  preview: InvitationPreview | null;
  lastApproval: ApproveInvitationsResponse | null;
  discover: () => Promise<void>;
  add: (candidate: NewCandidate) => Promise<void>;
  remove: (candidateId: string) => Promise<void>;
  openPreview: (candidateIds: string[]) => Promise<void>;
  // Re-render the same selection, e.g. after the server refused an approval because the email changed.
  refreshPreview: () => Promise<void>;
  closePreview: () => void;
  approve: () => Promise<void>;
  retry: () => Promise<void>;
}

/** Return the actions for one listing; reload refetches the overview after each write. */
export function useOutreachActions(listingId: string, reload: () => void, onApproved: () => void): OutreachActions {
  const [busy, setBusy] = useState<OutreachBusy>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<OutreachActions['actionError']>(null);
  const [approveError, setApproveError] = useState<ApiError | null>(null);
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewIds, setPreviewIds] = useState<string[]>([]);
  const [lastApproval, setLastApproval] = useState<ApproveInvitationsResponse | null>(null);

  // Runs one write, records a titled failure for anything the API refused, and rethrows anything else.
  const run = useCallback(async (title: string, work: () => Promise<void>): Promise<void> => {
    setActionError(null);
    try {
      await work();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setActionError({ title, error });
    }
  }, []);

  const discover = (): Promise<void> => run('Couldn’t search for suppliers', async () => {
    setBusy('discover');
    try {
      await runDiscovery(listingId);
      reload();
    } finally {
      setBusy(null);
    }
  });

  // Adding reports its own failure inside the drawer, so the error propagates to the caller instead.
  const add = async (candidate: NewCandidate): Promise<void> => {
    await addCandidate(listingId, candidate);
    reload();
  };

  const remove = (candidateId: string): Promise<void> => run('Couldn’t remove that supplier', async () => {
    setRemovingId(candidateId);
    try {
      await removeCandidate(candidateId);
      reload();
    } finally {
      setRemovingId(null);
    }
  });

  const openPreview = (candidateIds: string[]): Promise<void> => run('Couldn’t render the email', async () => {
    setBusy('preview');
    setApproveError(null);
    try {
      setPreview(await previewInvitations(listingId, candidateIds));
      setPreviewIds(candidateIds);
    } finally {
      setBusy(null);
    }
  });

  const approve = async (): Promise<void> => {
    if (!preview) {
      return;
    }
    setBusy('approve');
    setApproveError(null);
    try {
      // The same selection the preview was rendered from: the server re-renders it and approves only the recipients
      // that preview showed as emails. If anyone's eligibility changed since, the hash differs and it refuses (409).
      setLastApproval(await approveInvitations(listingId, previewIds, preview.message_hash));
      setPreview(null);
      onApproved();
      reload();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setApproveError(error);
    } finally {
      setBusy(null);
    }
  };

  const retry = (): Promise<void> => run('Couldn’t retry the queue', async () => {
    setBusy('retry');
    try {
      await retryQueue(listingId);
      reload();
    } finally {
      setBusy(null);
    }
  });

  return {
    busy,
    removingId,
    actionError,
    approveError,
    preview,
    lastApproval,
    discover,
    add,
    remove,
    openPreview,
    refreshPreview: () => openPreview(previewIds),
    closePreview: () => setPreview(null),
    approve,
    retry,
  };
}
