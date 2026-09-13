/* Calls the acceptance endpoints: the read-only check, then the accept itself (backend api/tasks/acceptance_router.py). */
import { get, post } from '../../../shared/api/client';
import type { TaskDetail } from '../types';

export interface AcceptanceBlock {
  code: 'already_accepted' | 'offer_not_active' | 'double_cover' | 'negative_remainder' | 'currency_mismatch' | 'split_undone';
  message: string;
}

export interface AcceptanceCheck {
  task_id: string;
  challenge_id: string;
  currency: string;
  billing_period: string;
  // The offer's recurring price restated in the task's billing period by the server.
  offer_price_minor: number;
  listed_price_minor: number | null;
  is_above_listed_price: boolean;
  // For a piece: the remainder of the business that split it off, if this offer were accepted.
  remainder_after_minor: number | null;
  blocks: AcceptanceBlock[];
  can_accept: boolean;
}

/** Load what accepting the offer would do, without changing anything. */
export function checkAcceptance(taskId: string, challengeId: string): Promise<AcceptanceCheck> {
  return get<AcceptanceCheck>(`/api/tasks/${taskId}/offers/${challengeId}/acceptance-check`);
}

/** Accept the offer; resolves to the poster's view of the task after ownership moved. */
export function acceptOffer(taskId: string, challengeId: string, isAbovePriceConfirmed: boolean): Promise<TaskDetail> {
  return post<TaskDetail>(`/api/tasks/${taskId}/offers/${challengeId}/accept`, { is_above_price_confirmed: isAbovePriceConfirmed });
}
