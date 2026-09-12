/* Turns stored category keys into readable labels for listings and expenses. */
const KNOWN_CATEGORIES: Record<string, string> = {
  cleaning: 'Commercial cleaning',
  commercial_cleaning: 'Commercial cleaning',
  landscaping: 'Landscaping',
  office_supplies: 'Office supplies',
  payroll: 'Payroll',
  pest_control: 'Pest control',
};

/** Return a readable category name; unknown keys are de-underscored rather than hidden. */
export function categoryLabel(category: string | null): string {
  if (!category) {
    return 'Uncategorized';
  }
  return KNOWN_CATEGORIES[category] ?? category.replace(/_/g, ' ');
}
