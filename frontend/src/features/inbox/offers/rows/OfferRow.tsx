/* One offer in the owner's ranked list: who (visible only to the owner), how it arrived, scope covered, the price as
   offered in its own billing period, potential savings, and a chip per evidence check. The whole row opens the offer
   drawer; the name and the Details button are the keyboard targets for the same action. Every figure is the server's,
   measured on the scope version it answered. */
import { BiddingModePill } from '../../../../shared/components/BiddingModePill';
import { Pill } from '../../../../shared/components/Pill';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { cadenceSuffix } from '../../../../shared/market';
import { answeredScopeLabel } from '../../../../shared/offers/answeredScopeLabel';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Button, Icon } from '../../../../shared/ui';
import { EvidenceChips } from '../../evidence/EvidenceChips';
import { SavingsFigure } from '../../savings/SavingsFigure';
import { ScopeCoverage } from '../../scope/ScopeCoverage';
import type { InboxChallenge, OwnerChallenge } from '../../types';
import { BilledPrice } from './BilledPrice';

interface OfferRowProps {
  offer: InboxChallenge;
  // The offer's terms as submitted (owner-only), for its price and billing period; null until they load.
  terms: OwnerChallenge | null;
  // The listing's billing period, to tell when the per-month comparison line helps.
  listingCadence: string;
  currentScopeVersionNumber: number;
  // Server rank within the list, 1-based; null for offers the server couldn't rank.
  rank: number | null;
  onOpen: (challengeId: string) => void;
}

/** Render one offer as a table row inside the ranked list's tbody. */
export function OfferRow({ offer, terms, listingCadence, currentScopeVersionNumber, rank, onOpen }: OfferRowProps): JSX.Element {
  const isEarlierScope = !offer.is_current_scope_version;
  const open = (): void => onOpen(offer.challenge_id);
  // The monthly restatement only adds something when the offer is billed on neither the listing's period nor monthly.
  const offerSuffix = terms ? cadenceSuffix(terms.billing_frequency) : null;
  const isComparedShown = offerSuffix !== null && offerSuffix !== cadenceSuffix(listingCadence) && offerSuffix !== cadenceSuffix('monthly');

  return (
    <tr className="ranked-offers__offer" onClick={open}>
      <td className="ranked-offers__challenger">
        <div className="ranked-offers__who">
          {rank === null ? null : <span className="ranked-offers__rank" title="Server rank: scope covered first, then price compared per month">#{rank}</span>}
          <button
            aria-haspopup="dialog"
            className="ranked-offers__name"
            onClick={(event) => {
              // The row's own click handler would open the drawer a second time.
              event.stopPropagation();
              open();
            }}
            type="button"
          >
            {offer.challenger_name}
          </button>
        </div>
        <div className="ranked-offers__when">
          {offer.revised_at ? `Revised ${formatTimestamp(offer.revised_at)}` : `Received ${formatTimestamp(offer.submitted_at)}`}
        </div>
        <div className="ranked-offers__badges">
          <ProvenanceBadge kind="offer" value={offer.provenance} />
          <BiddingModePill mode={offer.bidding_mode_at_submission} />
          {isEarlierScope ? (
            <Pill title="Scored against the scope this offer answered. It hasn't been revised since you changed the scope." tone="warning">
              {answeredScopeLabel(offer.answered_scope_version_number, currentScopeVersionNumber)}
            </Pill>
          ) : null}
        </div>
      </td>
      <td className="ranked-offers__block" data-label="Scope covered">
        <ScopeCoverage
          addedItems={offer.added_items}
          completeness={offer.scope_completeness}
          earlierVersionNumber={isEarlierScope ? offer.answered_scope_version_number : null}
          missingItems={offer.missing_items}
          unstatedItems={offer.unstated_items}
        />
      </td>
      <td className="ui-num" data-label="Price">
        {terms ? (
          <BilledPrice
            amountMinor={terms.price_minor}
            cadence={terms.billing_frequency}
            comparedMonthlyMinor={isComparedShown ? offer.normalized_price_minor : null}
            currency={terms.price_currency}
          />
        ) : (
          // Terms load separately; until then the server's per-month figure stands in, labelled as such.
          <BilledPrice amountMinor={offer.normalized_price_minor} cadence={null} currency={offer.price_currency} />
        )}
      </td>
      <td data-label="Potential savings">
        <SavingsFigure offer={offer} />
      </td>
      <td className="ranked-offers__block" data-label="Evidence">
        <EvidenceChips checks={offer.evidence_checks} />
      </td>
      <td className="ranked-offers__action">
        <Button
          aria-haspopup="dialog"
          aria-label={`Details for ${offer.challenger_name}'s offer`}
          iconEnd={<Icon name="chevron-right" size={16} />}
          onClick={(event) => {
            event.stopPropagation();
            open();
          }}
          size="sm"
          variant="ghost"
        >
          Details
        </Button>
      </td>
    </tr>
  );
}
