/* Asks the backend for an AI requirement draft (POST /api/requirement-drafts) and declares the shapes involved.
   The draft is only returned, never saved: rows reach a task when the owner saves the form they were added to. */
import { post } from '../../../../shared/api/client';
import type { TaskScopeDraftPayload } from '../draft/draftTypes';

export interface RequirementDraftContext {
  category: string;
  billingPeriod: string;
  serviceArea: string | null;
  // "piece" in the split drawer, so the model knows the rows describe work split off another task.
  purpose: 'task' | 'piece';
  // Requirement texts already on the form or task, so the draft doesn't repeat them.
  existingRequirements: string[];
}

export interface RequirementDraftResult {
  // not_run: no OpenAI key is configured. failed: the request ran and didn't produce a usable draft.
  status: 'drafted' | 'not_run' | 'failed';
  detail: string | null;
  requirements: TaskScopeDraftPayload['requirements'];
  open_questions: string[];
  dropped_count: number;
  model: string | null;
  prompt_version: string | null;
}

/** Request a draft from the owner's description; resolves with the stated result, rejects only on an API error. */
export function requestRequirementDraft(description: string, context: RequirementDraftContext): Promise<RequirementDraftResult> {
  return post<RequirementDraftResult>('/api/requirement-drafts', {
    description,
    category: context.category,
    billing_period: context.billingPeriod,
    service_area: context.serviceArea,
    purpose: context.purpose,
    existing_requirements: context.existingRequirements,
  });
}
