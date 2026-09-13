/* Declares the /api/invitations response shapes (backend app/api/invitations and app/services/outreach).
   Kept with the invitations feature: no other feature reads outreach data. */

export interface ChannelInfo {
  name: string;
  label: string;
  // False for the sandbox outbox: an approved invitation is stored for review and reaches no inbox.
  delivers_real_email: boolean;
  // Whether this channel can report delivery; the sandbox and plain SMTP can't, so "delivered" is never claimed.
  tracks_delivery: boolean;
}

export interface ComplianceCheck {
  key: string;
  label: string;
  passed: boolean;
  blocks_sending: boolean;
  detail: string;
}

export interface ComplianceReport {
  ready: boolean;
  checks: ComplianceCheck[];
}

export type DiscoveryRunStatus = 'ok' | 'unavailable' | 'error';

export interface DiscoveryRun {
  id: string;
  listing_id: string;
  source: string;
  source_label: string;
  status: DiscoveryRunStatus;
  detail: string | null;
  queries: string[];
  found_count: number;
  dropped_aggregator_count: number;
  merged_duplicate_count: number;
  new_candidate_count: number;
  ran_at: string;
}

export interface DiscoveryStatus {
  source: { name: string; label: string; available: boolean; unavailable_reason: string | null };
  last_run: DiscoveryRun | null;
}

/** One USAspending prime contract award won by the candidate's UEI. amount_minor is integer cents. */
export interface AwardEvidence {
  kind: 'usaspending_award';
  // The PIID as displayed; generated_award_id is USAspending's unique key.
  award_id: string;
  generated_award_id: string | null;
  url: string | null;
  recipient_uei: string;
  awarding_agency: string | null;
  amount_minor: number | null;
  currency: 'USD';
  start_date: string | null;
  naics_code: string | null;
  psc_code: string | null;
  place_of_performance_state: string | null;
  retrieved_at: string;
}

/** One web page returned by searching the candidate's name; it may describe a different business. */
export interface WebEvidence {
  kind: 'web_page';
  source: string;
  url: string;
  title: string | null;
  snippet: string | null;
  match_basis: 'name_search';
  retrieved_at: string;
}

export type CandidateEvidence = AwardEvidence | WebEvidence;

export interface Candidate {
  id: string;
  listing_id: string;
  business_name: string;
  website_url: string | null;
  contact_email: string | null;
  // The page the email was published on, when discovery found it.
  contact_email_source_url: string | null;
  phone: string | null;
  service_area: string | null;
  capability_summary: string | null;
  // discovered | manually_added
  origin: string;
  // fixture | tavily | usaspending_tavily | owner
  discovery_source: string;
  // demo_data | public_web | public_award | owner_entered
  provenance: string;
  // USAspending's recipient UEI, the candidate's identity when present; null for fixture, web and manual candidates.
  supplier_uei: string | null;
  source_urls: string[];
  evidence: CandidateEvidence[];
  retrieved_at: string | null;
  contacted_off_platform: boolean;
  created_at: string;
  eligibility: { can_invite: boolean; reason: string | null };
  invitation_id: string | null;
}

export type InvitationState = 'queued' | 'sending' | 'sent' | 'failed' | 'suppressed';

export interface Invitation {
  id: string;
  listing_id: string;
  provider_candidate_id: string;
  approval_id: string;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  body_text: string;
  headers: Record<string, string>;
  channel: string;
  state: InvitationState;
  // The state, or "challenged" once the invited business's account bid after the send.
  display_state: InvitationState | 'challenged';
  attempt_count: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  sent_at: string | null;
  failure_reason: string | null;
  provider_message_id: string | null;
  challenged_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachSummary {
  invited: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  suppressed: number;
  challenged: number;
  delivery_tracked: boolean;
}

export interface OutreachOverview {
  listing_id: string;
  listing_visibility: string;
  listing_is_public: boolean;
  listing_url: string;
  channel: ChannelInfo;
  compliance: ComplianceReport;
  discovery: DiscoveryStatus;
  candidates: Candidate[];
  invitations: Invitation[];
  summary: OutreachSummary;
}

export interface PreviewMessage {
  candidate_id: string;
  to_name: string;
  to_email: string;
  subject: string;
  body_text: string;
  headers: Record<string, string>;
}

export interface InvitationPreview {
  listing_id: string;
  listing_url: string;
  message_hash: string;
  template_version: string;
  channel: ChannelInfo;
  compliance: ComplianceReport;
  messages: PreviewMessage[];
  blocked: Array<{ candidate_id: string; business_name: string; reason: string }>;
}

export interface QueueRunSummary {
  attempted: number;
  sent: number;
  retry_scheduled: number;
  failed: number;
  suppressed: number;
  skipped: number;
}

export interface ApproveInvitationsResponse {
  approval_id: string;
  // True when this repeated an approval already recorded (a double click); nothing new was created or sent.
  replayed: boolean;
  invitations: Invitation[];
  queue: QueueRunSummary;
}

export interface NewCandidate {
  business_name: string;
  contact_email: string | null;
  website_url: string | null;
  phone: string | null;
  service_area: string | null;
  capability_summary: string | null;
  contacted_off_platform: boolean;
}

export interface OptOutDescription {
  email_masked: string | null;
  already_opted_out: boolean;
}
