/* The spacing steps layout helpers accept, matching the --space-* tokens in tokens.css. */
export type SpaceStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

/** Return the CSS value for a spacing step, e.g. 4 -> "var(--space-4)". */
export function spaceVar(step: SpaceStep): string {
  return `var(--space-${step})`;
}
