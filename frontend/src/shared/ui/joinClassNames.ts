/* Joins CSS class names, skipping the falsy ones, so primitives can add modifier classes conditionally. */

/** Return the truthy class names separated by single spaces (an empty string when none are truthy). */
export function joinClassNames(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}
