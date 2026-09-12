/* Turns backend scope-comparison keys ("task:vacuum", "supplies_included") into readable phrases. */
const FIELD_LABELS: Record<string, string> = {
  equipment_included: 'equipment included',
  supplies_included: 'supplies included',
  taxes_included: 'taxes included',
  visit_frequency: 'visit frequency',
  task: 'task',
};

/** Return a readable phrase for one scope item key produced by the comparison service. */
export function scopeItemLabel(item: string): string {
  const [field, detail] = item.split(/:(.*)/s, 2);
  const label = FIELD_LABELS[field] ?? field.replace(/_/g, ' ');
  return detail ? `${label}: ${detail}` : label;
}
