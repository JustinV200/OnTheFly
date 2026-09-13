/* The template's compliance checks, every one named, including ones that failed without blocking this channel.
   Accurate headers, a postal address and a working opt-out are properties of the template, not of this approval
   (CLAUDE.md, "Outbound"); this list shows the owner what the template guarantees and what is still missing. */
import { Icon } from '../../../shared/ui';
import type { ComplianceReport } from '../types';
import './ComplianceChecklist.css';

/** Render the checklist for one channel's compliance report. */
export function ComplianceChecklist({ report }: { report: ComplianceReport }): JSX.Element {
  return (
    <ul className="compliance-list">
      {report.checks.map((check) => {
        const status = check.passed ? 'passed' : check.blocks_sending ? 'blocking' : 'warning';
        return (
          <li className={`compliance-list__item compliance-list__item--${status}`} key={check.key}>
            <Icon name={check.passed ? 'check-circle' : check.blocks_sending ? 'alert-circle' : 'alert-triangle'} size={16} />
            <div>
              <p className="compliance-list__label">
                {check.label}
                <span className="compliance-list__status">
                  {check.passed ? 'Passed' : check.blocks_sending ? 'Blocks sending' : 'Not met · doesn’t block this channel'}
                </span>
              </p>
              <p className="compliance-list__detail">{check.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
