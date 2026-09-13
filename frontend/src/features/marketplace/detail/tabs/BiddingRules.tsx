/* The "How bidding works" tab: the marketplace rules a bidder agrees to, with this listing's own mode and deadline filled
   in. It restates CLAUDE.md "Marketplace mechanics" in plain words; it enforces nothing (the backend does). */
import type { ClosesIn } from '../../../../shared/market';
import { Icon, IconName } from '../../../../shared/ui';
import './BiddingRules.css';

interface BiddingRulesProps {
  // Anything but "open" is sealed, the same safe fallback BiddingModePill uses.
  biddingMode: string;
  closes: ClosesIn;
}

/** Render the rules list for one listing. */
export function BiddingRules({ biddingMode, closes }: BiddingRulesProps): JSX.Element {
  const isOpen = biddingMode === 'open';

  return (
    <div className="bidding-rules">
      <p className="bidding-rules__lead">
        This market uses <strong>{isOpen ? 'open bidding' : 'sealed bidding'}</strong>.
      </p>
      <ul className="bidding-rules__list">
        <Rule icon="lock" isCurrent={!isOpen} title="Sealed bidding">
          Only the business sees offer prices. Everyone else sees how many offers there are.
        </Rule>
        <Rule icon="eye" isCurrent={isOpen} title="Open bidding">
          Offer prices and how much of the scope each covers are public, so bidders can underbid. Who made each offer is not.
        </Rule>
        <Rule icon="users" title="Bidders stay anonymous">
          Your business is never shown to other bidders, in either mode. The business you bid to sees who you are.
        </Rule>
        <Rule icon="alert-circle" title="Mode changes are never retroactive">
          An offer made while bidding was sealed stays sealed even if the business opens bidding later. It still counts.
        </Rule>
        <Rule icon="clock" title="Deadline">
          {deadlineSentence(closes)}
        </Rule>
        <Rule icon="x" title="No bidding on your own listing">
          A business can’t make an offer on a task it published itself.
        </Rule>
        <Rule icon="check-circle" title="Scope before price">
          Offers are ranked by how much of the requested scope they cover, then by monthly price. Each offer stays attached
          to the scope version it answered.
        </Rule>
      </ul>
    </div>
  );
}

interface RuleProps {
  icon: IconName;
  title: string;
  // Marks the mode in force on this listing; the words "In force here" carry it, not only the highlight.
  isCurrent?: boolean;
  children: string;
}

function Rule({ icon, title, isCurrent = false, children }: RuleProps): JSX.Element {
  return (
    <li className={isCurrent ? 'bidding-rules__rule bidding-rules__rule--current' : 'bidding-rules__rule'}>
      <Icon className="bidding-rules__icon" name={icon} size={18} />
      <div>
        <p className="bidding-rules__title">
          {title}
          {isCurrent ? <span className="bidding-rules__current">In force here</span> : null}
        </p>
        <p className="bidding-rules__text">{children}</p>
      </div>
    </li>
  );
}

function deadlineSentence(closes: ClosesIn): string {
  if (closes.isClosed) {
    return `Closed to new offers since ${closes.exact}. Offers made before then still count.`;
  }
  if (closes.exact === null) {
    return 'No deadline is set. You can revise your offer while the listing is public.';
  }
  return `Offers close ${closes.exact}. You can revise yours until then; later offers are rejected.`;
}
