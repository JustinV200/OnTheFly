/* The categories the task form offers. One source of truth for the Basics select, the empty draft's default, and the
   REBID prefill, so a prefilled category is always one the select can display and save unchanged.
   Must stay in sync with the backend's category templates (services/tasks/scope). */

export interface TaskCategoryOption {
  value: string;
  label: string;
}

export const TASK_CATEGORIES: TaskCategoryOption[] = [
  { value: 'devsecops', label: 'DevSecOps' },
  { value: 'professional_services', label: 'Professional services' },
  { value: 'facilities', label: 'Facilities' },
];

// What a blank form starts on; the prefill only overwrites this, never a category the owner picked.
export const DEFAULT_TASK_CATEGORY = 'devsecops';
