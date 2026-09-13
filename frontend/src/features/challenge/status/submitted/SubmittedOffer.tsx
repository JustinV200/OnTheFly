/* Confirms a submitted offer with the terms it was recorded under, as the server stored them, then says what happens
   next. The success message states the recorded mode in words; the card below repeats the stored price, provenance, and
   what the offer includes: per requirement on a listing scoped as requirement rows, the free-text scope lists otherwise. */
import { BiddingModePill } from '../../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import { cadenceSuffix } from '../../../../shared/market';
import { ProvenanceBadge } from '../../../../shared/provenance/ProvenanceBadge';
import { Button, Callout, Card, Cluster, Stack, Stat } from '../../../../shared/ui';
import type { PublicRequirement } from '../../../publish/types';
import type { ChallengeResponse } from '../../types';
import { SubmittedRequirementAnswers } from './SubmittedRequirementAnswers';
import { WhatHappensNext } from './WhatHappensNext';
import './SubmittedOffer.css';

interface SubmittedOfferProps {
  offer: ChallengeResponse;
  // The listing's requirement rows, naming the stored answers; empty for a listing without them.
  requirements: PublicRequirement[];
  onReviseAgain: () => void;
}

/** Render the stored offer: price, the bidding mode this version was recorded under, provenance, time, and scope.
    onReviseAgain reopens the form, which starts from this version's terms. */
export function SubmittedOffer({ offer, requirements, onReviseAgain }: SubmittedOfferProps): JSX.Element {
  const article = offer.bidding_mode_at_submission === 'open' ? 'an' : 'a';
  const responses = offer.requirement_responses ?? [];
  const hasRequirementAnswers = responses.length > 0;
  // A requirement-based offer sends empty free-text lists, so "nothing stated" there would misreport it; the lists show
  // only when they say something. An older listing keeps the explicit "nothing stated".
  const isScopeListShown = !hasRequirementAnswers || offer.scope_included.length > 0 || offer.scope_excluded.length > 0;

  return (
    <Stack gap={4}>
      <Callout role="status" title={offer.revised_at ? 'Offer revised' : 'Offer submitted'} titleLevel={2} tone="success">
        <p>
          Recorded as {article} <strong>{offer.bidding_mode_at_submission}</strong> offer at{' '}
          {formatTimestamp(offer.revised_at ?? offer.submitted_at)}. That mode stays with this version even if the business changes
          the task later; a revision is recorded under the terms in force when you make it.
        </p>
      </Callout>

      <Card actions={<BiddingModePill mode={offer.bidding_mode_at_submission} />} title="Your offer as stored">
        <Stack gap={4}>
          <Stat
            caption={<ProvenanceBadge kind="offer" value={offer.provenance} />}
            label="Your price"
            size="lg"
            unit={cadenceSuffix(offer.billing_frequency)}
            value={<MoneyDisplay amountMinor={offer.price_minor} currency={offer.price_currency} />}
          />
          {/* The stored scope, so a revision that dropped terms is visible here and not first in the owner's inbox. */}
          {hasRequirementAnswers ? <SubmittedRequirementAnswers requirements={requirements} responses={responses} /> : null}
          {isScopeListShown ? (
            <dl className="submitted-offer__scope">
              {hasRequirementAnswers && offer.scope_included.length === 0 ? null : (
                <>
                  <dt>{hasRequirementAnswers ? 'Also includes' : 'Includes'}</dt>
                  <dd>{offer.scope_included.length > 0 ? offer.scope_included.join(', ') : 'nothing stated'}</dd>
                </>
              )}
              {offer.scope_excluded.length > 0 ? (
                <>
                  <dt>Excludes</dt>
                  <dd>{offer.scope_excluded.join(', ')}</dd>
                </>
              ) : null}
            </dl>
          ) : null}
          <p className="ui-text-muted">You can revise it until the deadline; earlier versions are kept.</p>
          {/* The only action here. The page's primary action and its way back to the board are in WhatHappensNext,
              so the confirmation offers one obvious next step rather than four competing exits. */}
          <Cluster gap={3}>
            <Button onClick={onReviseAgain}>Revise your offer</Button>
          </Cluster>
        </Stack>
      </Card>

      <WhatHappensNext />
    </Stack>
  );
}
