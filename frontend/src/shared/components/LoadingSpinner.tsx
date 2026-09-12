/* Renders a loading indicator that names what is loading.
   Named loading text keeps a slow network from looking like a blank, broken page. */
interface LoadingSpinnerProps {
  label?: string;
}

/** Show a text-based loading indicator. */
export function LoadingSpinner({ label = 'Loading…' }: LoadingSpinnerProps): JSX.Element {
  return (
    <div aria-busy="true" role="status" style={{ color: '#475569', padding: '1.5rem 0' }}>
      {label}
    </div>
  );
}
