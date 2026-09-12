/* Coordinates the publish flow's draft, preview, and publish API calls.
   The hook owns remote state so step components stay presentational. */
import { useState } from 'react';

import { ApiError, get, post } from '../../shared/api/client';
import { ApiQueryState, useApiQuery } from '../../shared/api/useApiQuery';
import type { ExpenseListResponse } from '../dashboard/types';
import type { ListingDraftResponse, ListingPreviewResponse } from './types';

type Step = 'editing' | 'drafting' | 'previewing' | 'publishing' | 'published';

interface UsePublishResult {
  expenses: ApiQueryState<ExpenseListResponse>;
  draft: ListingDraftResponse | null;
  preview: ListingPreviewResponse | null;
  step: Step;
  errorMessage: string | null;
  createDraft: (payload: Record<string, unknown>) => Promise<void>;
  publish: () => Promise<void>;
}

/** Load the owner's expenses and expose draft, preview, and publish actions. */
export function usePublish(): UsePublishResult {
  const expenses = useApiQuery<ExpenseListResponse>('/api/expenses');
  const [draft, setDraft] = useState<ListingDraftResponse | null>(null);
  const [preview, setPreview] = useState<ListingPreviewResponse | null>(null);
  const [step, setStep] = useState<Step>('editing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createDraft = async (payload: Record<string, unknown>): Promise<void> => {
    setErrorMessage(null);
    setPreview(null);
    setStep('drafting');
    try {
      const draftResponse = await post<ListingDraftResponse>('/api/listings', payload);
      setDraft(draftResponse);
      setPreview(await get<ListingPreviewResponse>(`/api/listings/${draftResponse.listing_id}/preview`));
      setStep('previewing');
    } catch (error) {
      // The server rejects drafts it can't compare (e.g. an irregular cadence); the owner needs
      // that reason to fix the form. Anything else is unexpected, so let it surface.
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setErrorMessage(error.message);
      setStep('editing');
    }
  };

  const publish = async (): Promise<void> => {
    if (!draft || !preview) {
      return;
    }
    setErrorMessage(null);
    setStep('publishing');
    try {
      // The hash proves the owner saw this exact payload; the server refuses if anything changed.
      const published = await post<ListingPreviewResponse>(`/api/listings/${draft.listing_id}/publish`, {
        previewed_payload_hash: preview.payload_hash,
      });
      setPreview(published);
      setStep('published');
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setErrorMessage(`Not published: ${error.message}`);
      setStep('previewing');
    }
  };

  return { expenses, draft, preview, step, errorMessage, createDraft, publish };
}
