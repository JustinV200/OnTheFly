/* Names a constraint kind in words for badges and form labels. Unknown kinds are de-underscored, never hidden. */
const LABELS: Record<string, string> = {
  clearance: 'Clearance',
  location: 'Location',
  insurance: 'Insurance',
  set_aside: 'Set-aside',
};

/** Return the readable label for a constraint kind. */
export function constraintLabel(kind: string): string {
  return LABELS[kind] ?? kind.replace(/_/g, ' ');
}
