/* Says in words why an expense can't be published. Payroll, taxes, and transfers are never publishable spend
   (CLAUDE.md, "Money and math"); an owner's own mark is named as theirs. */

const REASONS: Record<string, string> = {
  owner_marked_ineligible: 'You marked this not publishable',
  payroll: 'Payroll is never publishable',
  tax: 'Taxes are never publishable',
  transfer: 'Transfers are never publishable',
};

// Reasons that no owner choice can change, which is what lets a group be headed "Never publishable".
const STRUCTURAL_REASONS = new Set(['payroll', 'tax', 'transfer']);

/** Return the sentence for an eligibility reason; an unknown reason is shown as stored rather than hidden. */
export function notPublishableReason(eligibilityReason: string): string {
  return REASONS[eligibilityReason] ?? `Not publishable: ${eligibilityReason.replace(/_/g, ' ')}`;
}

/** True when the reason is payroll, tax, or a transfer: never publishable, whatever the owner chooses. */
export function isNeverPublishable(eligibilityReason: string): boolean {
  return STRUCTURAL_REASONS.has(eligibilityReason);
}
