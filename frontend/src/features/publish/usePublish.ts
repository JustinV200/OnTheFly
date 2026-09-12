/* Coordinates the publish flow's draft, preview, and publish API calls.
   The hook owns remote state so step components stay presentational. A preview answers one exact
   version of the form, so any edit discards it and Publish waits for a fresh preview. */
import { useRef, useState } from 'react';

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
  invalidatePreview: () => void;
  publish: () => Promise<void>;
}

/** Load the owner's expenses and expose draft, preview, invalidate, and publish actions. */
export function usePublish(): UsePublishResult {
  const expenses = useApiQuery<ExpenseListResponse>('/api/expenses');
  const [draft, setDraft] = useState<ListingDraftResponse | null>(null);
  const [preview, setPreview] = useState<ListingPreviewResponse | null>(null);
  const [step, setStep] = useState<Step>('editing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Bumped by every form edit and every new draft. A request only applies its answer while the
  // generation it started under is still current, so an edit made mid-request always wins.
  const formGenerationRef = useRef(0);

  const createDraft = async (payload: Record<string, unknown>): Promise<void> => {
    if (step === 'publishing' || step === 'published') {
      return;
    }
    formGenerationRef.current += 1;
    const generation = formGenerationRef.current;
    setErrorMessage(null);
    setDraft(null);
    setPreview(null);
    setStep('drafting');
    try {
      const draftResponse = await post<ListingDraftResponse>('/api/listings', payload);
      const previewResponse = await get<ListingPreviewResponse>(`/api/listings/${draftResponse.listing_id}/preview`);
      if (formGenerationRef.current !== generation) {
        // The owner changed the form while this was in flight, so this preview shows values they
        // no longer have. Dropping it keeps Publish disabled; the private draft row is overwritten next time.
        return;
      }
      setDraft(draftResponse);
      setPreview(previewResponse);
      setStep('previewing');
    } catch (error) {
      // The server rejects drafts it can't compare (e.g. an irregular cadence); the owner needs
      // that reason to fix the form. Anything else is unexpected, so let it surface.
      if (!(error instanceof ApiError)) {
        throw error;
      }
      if (formGenerationRef.current !== generation) {
        // The rejection is about values the owner has since changed; invalidatePreview already reset the step.
        return;
      }
      setErrorMessage(error.message);
      setStep('editing');
    }
  };

  /** Discard the draft and preview after any owner edit, so Publish needs a fresh preview. */
  const invalidatePreview = (): void => {
    formGenerationRef.current += 1;
    if (step === 'publishing' || step === 'published') {
      // A publish request already sent can't be recalled; publish() settles the step when it answers.
      return;
    }
    setDraft(null);
    setPreview(null);
    setStep('editing');
  };

  const publish = async (): Promise<void> => {
    if (step !== 'previewing' || !draft || !preview) {
      return;
    }
    const generation = formGenerationRef.current;
    setErrorMessage(null);
    setStep('publishing');
    try {
      // The hash proves the owner saw this exact payload; the server refuses if anything changed.
      const published = await post<ListingPreviewResponse>(`/api/listings/${draft.listing_id}/publish`, {
        previewed_payload_hash: preview.payload_hash,
      });
      // Applied whatever happened meanwhile: the listing is public now, and the owner must see what went out.
      setPreview(published);
      setStep('published');
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setErrorMessage(`Not published: ${error.message}`);
      if (formGenerationRef.current !== generation) {
        // The form changed while the request was out, so the preview on screen is stale.
        setDraft(null);
        setPreview(null);
        setStep('editing');
        return;
      }
      setStep('previewing');
    }
  };

  return { expenses, draft, preview, step, errorMessage, createDraft, invalidatePreview, publish };
}
