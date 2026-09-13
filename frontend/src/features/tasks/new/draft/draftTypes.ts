/* The task scope form's state and the API draft it becomes (backend services/tasks/scope/types.py TaskScopeDraft).
   Text fields hold what was typed; buildTaskDraftPayload parses and validates them into the API shape. */
import { DEFAULT_TASK_CATEGORY } from './taskCategories';

export interface RequirementDraft {
  // Local row id for React keys; key is the server's stable requirement key when editing an existing row.
  rowId: string;
  key: string | null;
  text: string;
  priority: 'must' | 'should';
  laborCategory: string;
  psc: string;
  naics: string;
  isTagsConfirmed: boolean;
  hours: string;
  isHoursConfirmed: boolean;
  // Where an existing row came from ("flowed-down" on a piece), kept when its scope is edited; null for a typed row.
  source: string | null;
}

export interface ConstraintDraft {
  rowId: string;
  kind: 'clearance' | 'location' | 'insurance' | 'set_aside';
  value: string;
}

export interface TaskDraftForm {
  title: string;
  category: string;
  serviceArea: string;
  // A REBID's confirmed current price, or a new task's budget (blank means no budget).
  price: string;
  billingPeriod: string;
  // Days from now until offers close; blank means no deadline.
  deadlineDays: string;
  mission: string;
  environments: string;
  frameworks: string;
  periodMonths: string;
  workModel: '' | 'on_site' | 'hybrid' | 'remote';
  requirements: RequirementDraft[];
  constraints: ConstraintDraft[];
}

// The API's draft, as sent and as returned by the demo template endpoints.
export interface TaskScopeDraftPayload {
  title: string;
  category: string;
  service_area: string | null;
  price_minor: number | null;
  currency: string;
  billing_period: string;
  challenge_deadline: string | null;
  category_fields: Record<string, string | number | string[]> | null;
  requirements: Array<{
    key: string | null;
    text: string;
    priority: 'must' | 'should';
    labor_category: string | null;
    psc: string | null;
    naics: string | null;
    tags_status: 'draft' | 'confirmed';
    hours_estimate: number | null;
    hours_status: 'draft' | 'confirmed' | 'unanswered';
    source: string;
  }>;
  constraints: Array<{ kind: ConstraintDraft['kind']; value: string }>;
  incumbent_vendor_name?: string | null;
}

let nextRowId = 0;

/** Return a fresh local row id. */
export function newRowId(): string {
  nextRowId += 1;
  return `row-${nextRowId}`;
}

/** Return an empty requirement row. */
export function emptyRequirement(): RequirementDraft {
  return { rowId: newRowId(), key: null, text: '', priority: 'must', laborCategory: '', psc: '', naics: '', isTagsConfirmed: false, hours: '', isHoursConfirmed: false, source: null };
}

/** Return an empty form with one requirement row, ready to type into. */
export function emptyTaskDraft(billingPeriod = 'annual'): TaskDraftForm {
  return {
    title: '',
    category: DEFAULT_TASK_CATEGORY,
    serviceArea: '',
    price: '',
    billingPeriod,
    deadlineDays: '14',
    mission: '',
    environments: '',
    frameworks: '',
    periodMonths: '',
    workModel: '',
    requirements: [emptyRequirement()],
    constraints: [],
  };
}
