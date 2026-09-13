/* A row of numbered links from the headline down to each step of the trace, so the chain can be read at a glance and
   any link jumped to. The steps' ids come from TraceStep ("trace-step-N"); this order must match TracePage's. */
import './TracePath.css';

interface TracePathProps {
  scopeVersionNumber: number;
  transactionCount: number;
}

/** Render the step links as an ordered list inside a named navigation region. */
export function TracePath({ scopeVersionNumber, transactionCount }: TracePathProps): JSX.Element {
  const steps = [
    'Savings',
    'Offer',
    `Scope v${scopeVersionNumber}`,
    'Listing',
    'Baseline',
    'Expense',
    `${transactionCount} ${transactionCount === 1 ? 'transaction' : 'transactions'}`,
  ];
  return (
    <nav aria-label="Steps in this trace" className="trace-path">
      <ol className="trace-path__list">
        {steps.map((label, index) => (
          <li className="trace-path__item" key={label}>
            <a className="trace-path__link" href={`#trace-step-${index + 1}`}>
              <span aria-hidden="true" className="trace-path__number">{index + 1}</span>
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
