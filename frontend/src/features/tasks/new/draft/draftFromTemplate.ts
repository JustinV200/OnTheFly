/* Turns a server-side demo scope (GovCon's DevSecOps REBID or the example new task) into form state, so the rehearsal
   shortcut fills the same fields an owner would type and the owner still reviews every one before confirming. */
import { formatMinorForInput } from '../../../../shared/format/formatMinorForInput';
import { newRowId, TaskDraftForm, TaskScopeDraftPayload } from './draftTypes';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Return form state holding the template's values. */
export function draftFromTemplate(template: TaskScopeDraftPayload): TaskDraftForm {
  const fields = template.category_fields ?? {};
  const text = (value: unknown): string => (typeof value === 'string' ? value : '');
  const joined = (value: unknown): string => (Array.isArray(value) ? value.join(', ') : '');
  const days = template.challenge_deadline ? Math.max(1, Math.round((new Date(template.challenge_deadline).getTime() - Date.now()) / DAY_MS)) : null;

  return {
    title: template.title,
    category: template.category,
    serviceArea: template.service_area ?? '',
    price: template.price_minor === null ? '' : formatMinorForInput(template.price_minor),
    billingPeriod: template.billing_period,
    deadlineDays: days === null ? '' : String(days),
    mission: text(fields.mission_summary),
    environments: joined(fields.environments),
    frameworks: joined(fields.compliance_frameworks),
    periodMonths: typeof fields.period_of_performance_months === 'number' ? String(fields.period_of_performance_months) : '',
    workModel: (['on_site', 'hybrid', 'remote'] as const).find((value) => value === fields.work_model) ?? '',
    requirements: template.requirements.map((row) => ({
      rowId: newRowId(),
      key: null,
      text: row.text,
      priority: row.priority,
      laborCategory: row.labor_category ?? '',
      psc: row.psc ?? '',
      naics: row.naics ?? '',
      isTagsConfirmed: row.tags_status === 'confirmed',
      hours: row.hours_estimate === null ? '' : String(row.hours_estimate),
      isHoursConfirmed: row.hours_status === 'confirmed',
    })),
    constraints: template.constraints.map((row) => ({ rowId: newRowId(), kind: row.kind, value: row.value })),
  };
}
