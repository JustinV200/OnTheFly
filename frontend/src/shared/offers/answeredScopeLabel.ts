/* Names the scope version an offer answered, for offers made before the owner re-scoped the listing. */

/** Return "Answered scope vN (current is vM)"; callers show it only when the two versions differ. */
export function answeredScopeLabel(answeredVersion: number, currentVersion: number): string {
  return `Answered scope v${answeredVersion} (current is v${currentVersion})`;
}
