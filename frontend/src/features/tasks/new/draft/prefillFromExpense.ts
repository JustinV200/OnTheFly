/* What a REBID form can take from the expense being rebid: its vendor as the title, and its category when the form's
   select offers that same category. Prefill only, for fields the owner hasn't touched — the owner reviews and can change
   every one before confirming. The price is not set here (NewTaskPage starts it from observed spend and tracks whether
   the owner has since typed), and an expense carries no service area to prefill (dashboard/types ExpenseDetail). */
import type { ExpenseDetail } from '../../../dashboard/types';
import type { TaskDraftForm } from './draftTypes';
import { DEFAULT_TASK_CATEGORY, TASK_CATEGORIES } from './taskCategories';

/** Return the fields to prefill from the expense. Fields the form already holds a value for are left out; the patch is
    empty when nothing applies, so the caller can skip the state update entirely. */
export function prefillFromExpense(expense: ExpenseDetail, form: TaskDraftForm): Partial<TaskDraftForm> {
  const patch: Partial<TaskDraftForm> = {};

  const vendor = expense.vendor.trim();
  if (vendor !== '' && form.title.trim() === '') {
    patch.title = vendor;
  }

  // Only a category this form's select offers: any other stored key would show one option and save another.
  const category = expense.category;
  if (category !== null && form.category === DEFAULT_TASK_CATEGORY && TASK_CATEGORIES.some((option) => option.value === category)) {
    patch.category = category;
  }

  return patch;
}
