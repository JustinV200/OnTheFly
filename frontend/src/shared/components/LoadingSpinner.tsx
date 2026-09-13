/* Renders a loading indicator that names what is loading, over a skeleton of the content to come.
   Named loading text keeps a slow network from looking like a blank, broken page; the skeleton shows where it will land. */
import { Skeleton, Spinner } from '../ui';
import './pageStates.css';

interface LoadingSpinnerProps {
  label?: string;
}

/** Show a spinner with its label (announced politely) above three placeholder lines. */
export function LoadingSpinner({ label = 'Loading…' }: LoadingSpinnerProps): JSX.Element {
  return (
    <div aria-busy="true" className="page-state page-state-loading" role="status">
      <div className="page-state-loading__label">
        <Spinner size="sm" />
        {label}
      </div>
      <div className="page-state-loading__lines">
        <Skeleton width="38%" />
        <Skeleton width="92%" />
        <Skeleton width="71%" />
      </div>
    </div>
  );
}
