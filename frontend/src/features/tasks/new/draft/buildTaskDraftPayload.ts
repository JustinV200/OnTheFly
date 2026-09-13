/* Turns the task scope form into the API draft, or the first problem as a sentence. Money is parsed to integer minor
   units without floating point; hours must be whole numbers. Blank stays unanswered, never zero (CLAUDE.md, AI boundaries). */
import { parseDollarsToMinor } from '../../../../shared/format/parseDollarsToMinor';
import { buildRequirementRows } from './buildRequirementRows';
import type { TaskDraftForm, TaskScopeDraftPayload } from './draftTypes';

export type DraftBuildResult = { payload: TaskScopeDraftPayload } | { error: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Validate the form and build the payload. isPriceRequired is true for a REBID, whose starting price is observed spend. */
export function buildTaskDraftPayload(form: TaskDraftForm, isPriceRequired: boolean): DraftBuildResult {
  if (!form.title.trim()) {
    return { error: 'Give the task a title.' };
  }
  const priceText = form.price.trim();
  const priceMinor = priceText === '' ? null : parseDollarsToMinor(priceText);
  if (priceText !== '' && (priceMinor === null || priceMinor === 0)) {
    return { error: 'Enter the price in dollars above $0, for example 120,000.' };
  }
  if (isPriceRequired && priceMinor === null) {
    return { error: 'Confirm what you pay now: a REBID’s starting price is your observed spend.' };
  }
  const requirements = buildRequirementRows(form.requirements);
  if ('error' in requirements) {
    return requirements;
  }
  if (requirements.rows.length === 0) {
    return { error: 'Add at least one requirement.' };
  }
  const days = form.deadlineDays.trim();
  if (days !== '' && !/^\d+$/.test(days)) {
    return { error: 'Days until offers close must be a whole number, or blank for no deadline.' };
  }

  return {
    payload: {
      title: form.title.trim(),
      category: form.category.trim() || 'devsecops',
      service_area: form.serviceArea.trim() || null,
      price_minor: priceMinor,
      currency: 'USD',
      billing_period: form.billingPeriod,
      challenge_deadline: days === '' ? null : new Date(Date.now() + Number(days) * DAY_MS).toISOString(),
      category_fields: form.category === 'devsecops' ? devSecOpsFields(form) : null,
      requirements: requirements.rows,
      constraints: form.constraints.filter((row) => row.value.trim() !== '').map((row) => ({ kind: row.kind, value: row.value.trim() })),
    },
  };
}

function devSecOpsFields(form: TaskDraftForm): TaskScopeDraftPayload['category_fields'] {
  const fields: Record<string, string | number | string[]> = {};
  const list = (text: string): string[] => text.split(',').map((item) => item.trim()).filter(Boolean);
  if (form.mission.trim()) fields.mission_summary = form.mission.trim();
  if (list(form.environments).length) fields.environments = list(form.environments);
  if (list(form.frameworks).length) fields.compliance_frameworks = list(form.frameworks);
  if (/^\d+$/.test(form.periodMonths.trim())) fields.period_of_performance_months = Number(form.periodMonths.trim());
  if (form.workModel) fields.work_model = form.workModel;
  // Unanswered template fields stay absent rather than empty strings the template would reject or publish.
  return Object.keys(fields).length > 0 ? fields : null;
}
