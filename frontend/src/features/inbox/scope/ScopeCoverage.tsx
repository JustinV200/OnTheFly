/* How much of the requested scope an offer covers: the server's completeness as a percentage and a bar, then every gap
   in plain words ("Missing: equipment included"), never raw keys. Gaps sit beside price so a cheaper offer that covers
   less can't read as cheaper (CLAUDE.md, money and math). The percentage is the server's figure, only formatted here. */
import { Icon } from '../../../shared/ui';
import { ScopeDeltaBadge } from './ScopeDeltaBadge';
import './ScopeCoverage.css';

interface ScopeCoverageProps {
  // Server-computed, 0 to 1, against the scope version the offer answered.
  completeness: number;
  missingItems: string[];
  unstatedItems: string[];
  addedItems: string[];
  // Set when the offer answered an earlier scope version, so the figure names the version it is measured on.
  earlierVersionNumber: number | null;
  // Rows keep to gaps; the drawer also lists extras the challenger added.
  isAddedShown?: boolean;
}

/** Render the coverage figure, bar, and scope gaps for one offer. */
export function ScopeCoverage({ completeness, missingItems, unstatedItems, addedItems, earlierVersionNumber, isAddedShown = false }: ScopeCoverageProps): JSX.Element {
  const percent = Math.round(completeness * 100);
  const hasGaps = missingItems.length + unstatedItems.length > 0;
  const shownAdded = isAddedShown ? addedItems : [];

  return (
    <div className="scope-coverage">
      <div className="scope-coverage__figure">
        <span className="scope-coverage__percent ui-num">{percent}%</span>
        <span className="scope-coverage__of">of scope{earlierVersionNumber === null ? '' : ` v${earlierVersionNumber}`}</span>
      </div>
      {/* Decorative: the percentage above carries the value. The width is data-driven, the one inline style allowed. */}
      <div aria-hidden="true" className="scope-coverage__track">
        <div className={hasGaps ? 'scope-coverage__fill scope-coverage__fill--gaps' : 'scope-coverage__fill'} style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
      </div>
      {hasGaps || shownAdded.length > 0 ? (
        <div className="scope-coverage__gaps">
          {missingItems.map((item) => <ScopeDeltaBadge item={item} key={`m-${item}`} kind="missing" />)}
          {unstatedItems.map((item) => <ScopeDeltaBadge item={item} key={`u-${item}`} kind="unstated" />)}
          {shownAdded.map((item) => <ScopeDeltaBadge item={item} key={`a-${item}`} kind="added" />)}
        </div>
      ) : null}
      {hasGaps ? null : (
        <div className="scope-coverage__complete">
          <Icon name="check" size={14} />
          {earlierVersionNumber === null ? 'Covers everything requested' : `Covers scope v${earlierVersionNumber} as requested`}
        </div>
      )}
    </div>
  );
}
