/* Loads what the offer trace response doesn't carry for a listing scoped as requirement rows: the listing's title and
   requirement rows (from the owner's listing preview) and this offer's per-requirement answers (from the owner's offer
   list). Both endpoints are owner-only, like the trace itself. A stopgap until the trace response carries them itself;
   it adds no data a poster couldn't already see on its inbox. */
import type { ApiError } from '../../../shared/api/client';
import { useApiQuery } from '../../../shared/api/useApiQuery';
import type { ListingPreviewResponse, PublicRequirement } from '../../publish/types';

// One answer as GET /api/listings/{id}/challenges returns it (backend services/challenges/requirement_responses.py).
export interface TraceRequirementAnswer {
  requirement_key: string;
  is_included: boolean;
  note: string | null;
}

// Only the fields this trace reads from the owner's offer list.
interface OwnerOfferList {
  challenges: { id: string; requirement_responses?: TraceRequirementAnswer[] }[];
}

export type TraceRequirementContext =
  | { status: 'loading' }
  | { status: 'failed'; error: ApiError; reload: () => void }
  | {
      status: 'ready';
      // The task's title; null for a listing from before tasks, which is titled by its category.
      title: string | null;
      // The listing's current requirement rows; empty for an older on-site scope listing.
      requirements: PublicRequirement[];
      // This offer's answers, or null when it isn't among the listing's active offers any more.
      answers: TraceRequirementAnswer[] | null;
    };

/** Load the listing's title and requirement rows and this offer's answers, for the listing and offer being traced.
    listingId is null until the trace has loaded; nothing is requested until then and the context reads as loading. */
export function useTraceRequirements(listingId: string | null, challengeId: string): TraceRequirementContext {
  const preview = useApiQuery<ListingPreviewResponse>(listingId ? `/api/listings/${listingId}/preview` : null);
  const offers = useApiQuery<OwnerOfferList>(listingId ? `/api/listings/${listingId}/challenges` : null);

  const error = preview.error ?? offers.error;
  if (error) {
    return {
      status: 'failed',
      error,
      reload: () => {
        preview.reload();
        offers.reload();
      },
    };
  }
  if (!preview.data || !offers.data) {
    return { status: 'loading' };
  }

  const offer = offers.data.challenges.find((challenge) => challenge.id === challengeId);
  return {
    status: 'ready',
    title: preview.data.projection.title ?? null,
    requirements: preview.data.projection.requirements ?? [],
    answers: offer ? offer.requirement_responses ?? [] : null,
  };
}
