/* Renders a small loading indicator used by async feature screens.
   It stays intentionally simple during early build phases. */
/** Shows a text-based loading indicator. */
export function LoadingSpinner(): JSX.Element {
  return <div aria-busy="true">Loading…</div>;
}
