/* Coordinates the publish flow's draft, preview, and publish API calls.
   The hook owns remote state so step components stay presentational. */
import { useEffect, useState } from 'react';

import { ApiError, get, post } from '../../shared/api/client';
import type { ExpenseListResponse } from '../dashboard/types';
import type { ListingDraftResponse, ListingPreviewResponse, PublishableExpense } from './types';

interface UsePublishResult {
  expenses: PublishableExpense[];
  draft: ListingDraftResponse | null;
  preview: ListingPreviewResponse | null;
  errorMessage: string | null;
  createDraft: (payload: Record<string, unknown>) => Promise<void>;
  publish: () => Promise<void>;
}

/** Load publishable expenses and expose listing draft actions. */
export function usePublish(): UsePublishResult {
  const [expenses, setExpenses] = useState<PublishableExpense[]>([]);
  const [draft, setDraft] = useState<ListingDraftResponse | null>(null);
  const [preview, setPreview] = useState<ListingPreviewResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await get<ExpenseListResponse>('/api/expenses');
      setExpenses(response.expenses.filter((expense) => expense.is_publishable));
    })();
  }, []);

  const createDraft = async (payload: Record<string, unknown>): Promise<void> => {
    setErrorMessage(null);
    try {
      const draftResponse = await post<ListingDraftResponse>('/api/listings', payload);
      setDraft(draftResponse);
      const previewResponse = await get<ListingPreviewResponse>(`/api/listings/${draftResponse.listing_id}/preview`);
      setPreview(previewResponse);
    } catch (error) {
      // The server rejects drafts it can't compare (e.g. an irregular cadence); the owner
      // needs that reason to fix the form. Anything else is unexpected, so let it surface.
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setErrorMessage(error.message);
    }
  };

  const publish = async (): Promise<void> => {
    if (!draft || !preview) {
      return;
    }
    const publishResponse = await post<ListingPreviewResponse>(`/api/listings/${draft.listing_id}/publish`, {
      previewed_payload_hash: preview.payload_hash,
    });
    setPreview(publishResponse);
  };

  return { expenses, draft, preview, errorMessage, createDraft, publish };
}
