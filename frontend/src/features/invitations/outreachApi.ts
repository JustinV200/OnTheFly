/* The owner's outreach actions against /api/invitations. Reads go through useApiQuery in the page; these are the
   writes. Only approveInvitations can send anything, and only for the exact batch the owner previewed. */
import { del, post } from '../../shared/api/client';
import type {
  ApproveInvitationsResponse,
  Candidate,
  DiscoveryRun,
  InvitationPreview,
  NewCandidate,
  QueueRunSummary,
} from './types';

const BASE = '/api/invitations';

/** The overview path for one listing, for useApiQuery. */
export function outreachOverviewPath(listingId: string): string {
  return `${BASE}/listings/${encodeURIComponent(listingId)}`;
}

/** Run discovery once for the listing. Finds candidates; invites no one. */
export function runDiscovery(listingId: string): Promise<DiscoveryRun> {
  return post<DiscoveryRun>(`${outreachOverviewPath(listingId)}/discover`);
}

/** Add a supplier the owner found by hand. */
export function addCandidate(listingId: string, candidate: NewCandidate): Promise<Candidate> {
  return post<Candidate>(`${outreachOverviewPath(listingId)}/candidates`, candidate);
}

/** Remove a candidate that hasn't been invited. */
export function removeCandidate(candidateId: string): Promise<void> {
  return del<void>(`${BASE}/candidates/${encodeURIComponent(candidateId)}`);
}

/** Render the exact emails for the selection. Stores and sends nothing. */
export function previewInvitations(listingId: string, candidateIds: string[]): Promise<InvitationPreview> {
  return post<InvitationPreview>(`${outreachOverviewPath(listingId)}/preview`, { candidate_ids: candidateIds });
}

/** Approve the previewed batch; the server re-renders, refuses a changed message (409), then sends. */
export function approveInvitations(listingId: string, candidateIds: string[], previewedMessageHash: string): Promise<ApproveInvitationsResponse> {
  return post<ApproveInvitationsResponse>(`${outreachOverviewPath(listingId)}/approve`, {
    candidate_ids: candidateIds,
    previewed_message_hash: previewedMessageHash,
  });
}

/** Send already-approved invitations whose retry time has come. Never re-sends a sent one. */
export function retryQueue(listingId: string): Promise<QueueRunSummary> {
  return post<QueueRunSummary>(`${outreachOverviewPath(listingId)}/process-queue`);
}
