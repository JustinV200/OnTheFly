/* Everything about one offer without leaving the ranked list: scope covered, the monthly price, potential savings and
   why they are provisional, every evidence record, the challenger's message, terms as offered, and history.
   Owner-only, like the page; the footer leads to the trace of the savings figure. Scope comes before price here too. */
import type { ApiQueryState } from '../../../shared/api/useApiQuery';
import { ErrorState } from '../../../shared/components/ErrorState';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { ButtonLink, Drawer, Icon, Skeleton, Stat } from '../../../shared/ui';
import { EvidenceRecords } from '../evidence/EvidenceRecords';
import { SavingsBreakdown } from '../savings/SavingsBreakdown';
import { ScopeCoverage } from '../scope/ScopeCoverage';
import { AcceptOfferPanel } from '../../tasks/acceptance/AcceptOfferPanel';
import type { TaskDetail } from '../../tasks/types';
import type { InboxChallenge, InboxTaskSummary, OwnerChallengeListResponse } from '../types';
import { DrawerSection } from './DrawerSection';
import { OfferHistory } from './sections/OfferHistory';
import { OfferTerms } from './sections/OfferTerms';
import './OfferDrawer.css';

interface OfferDrawerProps {
  // The ranked offer to show; null keeps the drawer closed.
  offer: InboxChallenge | null;
  // Full terms and messages, from the owner's offers endpoint, matched to the ranked offer by id.
  ownerOffers: ApiQueryState<OwnerChallengeListResponse>;
  onClose: () => void;
  // The listing's task; acceptance is offered while no offer on it has been accepted.
  task: InboxTaskSummary | null;
  // Whether the listing is a rebid of an expense: only those have a trace from savings down to transactions.
  hasExpense: boolean;
  onAccepted: (task: TaskDetail) => void;
}

/** Render the offer drawer while an offer is selected. */
export function OfferDrawer({ offer, ownerOffers, onClose, task, hasExpense, onAccepted }: OfferDrawerProps): JSX.Element | null {
  if (!offer) {
    return null;
  }
  const terms = ownerOffers.data?.challenges.find((candidate) => candidate.id === offer.challenge_id) ?? null;
  const isEarlierScope = !offer.is_current_scope_version;

  return (
    <Drawer
      description={(
        <span className="offer-drawer__description">
          <span>Only you see who made this offer</span>
          <ProvenanceBadge kind="offer" value={offer.provenance} />
        </span>
      )}
      footer={hasExpense ? (
        <ButtonLink iconEnd={<Icon name="arrow-right" size={16} />} to={`/offers/${offer.challenge_id}/trace`} variant="secondary">
          Where does this number come from?
        </ButtonLink>
      ) : undefined}
      isOpen
      onClose={onClose}
      title={offer.challenger_name}
    >
      <div className="offer-drawer">
        {task && task.accepted_challenge_id === null ? (
          <DrawerSection title="Accept this offer">
            <AcceptOfferPanel bidderName={offer.challenger_name} challengeId={offer.challenge_id} onAccepted={onAccepted} taskId={task.id} />
          </DrawerSection>
        ) : null}
        {task && task.accepted_challenge_id === offer.challenge_id ? (
          <DrawerSection title="Accepted">
            <p className="offer-drawer__muted">You accepted this offer. {offer.challenger_name} owns the task now.</p>
          </DrawerSection>
        ) : null}
        <DrawerSection title="Scope covered">
          <ScopeCoverage
            addedItems={offer.added_items}
            completeness={offer.scope_completeness}
            earlierVersionNumber={isEarlierScope ? offer.answered_scope_version_number : null}
            isAddedShown
            missingItems={offer.missing_items}
            unstatedItems={offer.unstated_items}
          />
        </DrawerSection>

        <DrawerSection title="Price">
          <Stat
            caption="Restated per month by the server, so offers billed on different schedules compare fairly"
            label="Monthly"
            size="md"
            unit="/ month"
            value={<MoneyDisplay amountMinor={offer.normalized_price_minor} currency={offer.price_currency} />}
          />
        </DrawerSection>

        <DrawerSection title="Potential savings">
          <SavingsBreakdown offer={offer} />
        </DrawerSection>

        <DrawerSection title="Evidence">
          <EvidenceRecords checks={offer.evidence_checks} lastUpdated={offer.evidence_last_updated} rollup={offer.evidence_rollup} />
        </DrawerSection>

        <DrawerSection title="Message from the challenger">
          {terms ? (
            terms.message_to_owner
              ? <blockquote className="offer-drawer__message">{terms.message_to_owner}</blockquote>
              : <p className="offer-drawer__muted">No message.</p>
          ) : <TermsPending isQuiet ownerOffers={ownerOffers} />}
        </DrawerSection>

        <DrawerSection title="Terms as offered">
          {terms ? <OfferTerms offer={terms} /> : <TermsPending ownerOffers={ownerOffers} />}
        </DrawerSection>

        <DrawerSection title="History">
          <OfferHistory offer={offer} />
        </DrawerSection>
      </div>
    </Drawer>
  );
}

// The owner's offers list loads separately from the ranking; until it arrives, say which of loading or failure it is.
// isQuiet names a failure in one line, for the second section that depends on the same request.
function TermsPending({ ownerOffers, isQuiet = false }: { ownerOffers: ApiQueryState<OwnerChallengeListResponse>; isQuiet?: boolean }): JSX.Element {
  if (ownerOffers.error) {
    return isQuiet
      ? <p className="offer-drawer__muted">Couldn’t load: {ownerOffers.error.message}</p>
      : <ErrorState error={ownerOffers.error} onRetry={ownerOffers.reload} title="Couldn’t load this offer’s terms" />;
  }
  if (ownerOffers.data) {
    // Loaded, but this offer isn't in it yet: the two lists poll separately, so the next poll should bring it.
    return <p className="offer-drawer__muted">This offer’s terms haven’t arrived yet; they refresh automatically.</p>;
  }
  return <span role="status"><Skeleton width="60%" /><span className="ui-visually-hidden">Loading terms</span></span>;
}
