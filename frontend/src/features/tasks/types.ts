/* Declares the task API shapes the task page, My work and the demo guide read (backend services/tasks/views/types.py and
   services/tasks/money/types.py). Every figure is integer minor units in the task's one currency and billing period. */
import type { PublicScopeField } from '../publish/types';

export type TaskRelationship = 'poster_and_owner' | 'poster' | 'owner';

export interface Counterparty {
  // "client" for the owner's view of its poster; "task_owner" for a poster's view of the bidder it accepted.
  role: string;
  business_name: string;
  handle: string;
}

export interface PieceLine {
  task_id: string;
  title: string | null;
  cut_minor: number;
  accepted_price_minor: number | null;
  committed_minor: number;
  status: string;
  listing_visibility: string | null;
  offer_count: number;
  accepted_bidder: Counterparty | null;
  is_subcontract: boolean;
}

export interface OwnerMoneyView {
  task_id: string;
  currency: string;
  billing_period: string;
  client: Counterparty | null;
  starting_price_minor: number;
  pieces: PieceLine[];
  total_cuts_minor: number;
  committed_minor: number;
  remainder_minor: number;
  // Null when any retained requirement lacks hours or a rate; keep_cost_gaps says which.
  keep_cost_minor: number | null;
  keep_cost_gaps: string[];
  potential_margin_minor: number | null;
}

export interface BuyerMoneyView {
  task_id: string;
  origin: string;
  currency: string;
  billing_period: string;
  baseline_minor: number | null;
  baseline_label: string;
  task_status: string;
  task_amount_minor: number | null;
  accepted_bidder: Counterparty | null;
  own_pieces: PieceLine[];
  committed_minor: number | null;
  potential_difference_minor: number | null;
  difference_label: string;
  is_fully_accepted: boolean;
}

export interface PieceCommitment {
  split_id: string;
  child_task_id: string;
  cut_minor: number;
  accepted_price_minor: number | null;
  committed_minor: number;
}

export interface TaskLedger {
  task_id: string;
  currency: string;
  billing_period: string;
  starting_price_minor: number | null;
  starting_price_basis: 'listed_price' | 'accepted_offer';
  pieces: PieceCommitment[];
  total_cuts_minor: number;
  committed_minor: number;
  remainder_minor: number | null;
}

export interface RequirementRow {
  key: string;
  text: string;
  priority: string;
  labor_category: string | null;
  psc: string | null;
  naics: string | null;
  tags_status: string;
  hours_estimate: number | null;
  hours_status: string;
  source: string;
  // The viewer's own piece this requirement went to; null while it stays with the task.
  piece: { task_id: string; title: string | null } | null;
}

export interface ConstraintRow {
  kind: string;
  value: string;
  is_inherited: boolean;
}

export interface ListingSummary {
  id: string;
  visibility: string;
  bidding_mode: string;
  price_disclosed: boolean;
  stated_price_minor: number | null;
  offer_count: number;
  published_at: string | null;
  challenge_deadline: string | null;
  scope_version_number: number;
}

export interface TaskEventView {
  kind: string;
  created_at: string;
  actor_name: string;
  summary: string;
}

export interface TaskDetail {
  id: string;
  origin: 'rebid' | 'new' | 'split';
  state: string;
  title: string | null;
  category: string;
  currency: string;
  billing_period: string;
  depth: number;
  created_at: string;
  relationship: TaskRelationship;
  is_posted_by_you: boolean;
  is_owned_by_you: boolean;
  is_subcontract: boolean;
  parent_scope_changed_at: string | null;
  expense_id: string | null;
  listing: ListingSummary | null;
  scope_version_number: number | null;
  requirements: RequirementRow[];
  constraints: ConstraintRow[];
  scope_fields: PublicScopeField[];
  ledger: TaskLedger | null;
  pieces: PieceLine[];
  buyer_money: BuyerMoneyView | null;
  owner_money: OwnerMoneyView | null;
  can_split: boolean;
  split_block_reason: string | null;
  active_suggested_pieces: number;
  max_suggested_pieces: number;
  events: TaskEventView[];
}

export interface WorkItem {
  task_id: string;
  title: string | null;
  origin: string;
  state: string;
  category: string;
  currency: string;
  billing_period: string;
  relationship: string;
  is_subcontract: boolean;
  listing_id: string | null;
  listing_visibility: string | null;
  offer_count: number;
  buyer_money: BuyerMoneyView | null;
  owner_money: OwnerMoneyView | null;
  next_step: string | null;
}

export interface WorkResponse {
  owned: WorkItem[];
  posted: WorkItem[];
}
