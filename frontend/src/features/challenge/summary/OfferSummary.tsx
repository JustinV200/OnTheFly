/* The order ticket's "Your offer" card: the price as typed with its billing period's short suffix, a one-line count of
   what the offer includes (the full requested-vs-offered table folds open), the one explanation of the bidding mode, and
   the submit button with its mode label. Kept short so the button is in view on a laptop. Display only: it normalizes,
   converts, and scores nothing, so it can never disagree with how the server scores the offer. */
import type { ReactNode } from 'react';

import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { ListedPrice } from '../../../shared/components/ListedPrice';
import { cadenceSuffix, describeBilling } from '../../../shared/market';
import { Button, Callout, Card, Stack } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import type { ChallengeFormFields } from '../buildChallengePayload';
import type { BiddingModeValue } from '../types';
import { CoverageSummary } from './checklist/CoverageSummary';
import { ModeMeaning } from './ModeMeaning';
import { submitLabel } from './submitLabel';
import './OfferSummary.css';

interface OfferSummaryProps {
  formId: string;
  fields: ChallengeFormFields;
  listing: PublicListingProjection;
  acknowledgedMode: BiddingModeValue | null;
  currentMode: BiddingModeValue;
  onConfirmMode: () => void;
  isRevision: boolean;
  isSubmitting: boolean;
  validationError: string | null;
  // The server's rejection of the last submit; null when there is none.
  submitProblem: ReactNode;
}

/** Render the summary card; its submit button submits the form identified by formId. */
export function OfferSummary(props: OfferSummaryProps): JSX.Element {
  const { formId, fields, listing, acknowledgedMode, currentMode, onConfirmMode, isRevision, isSubmitting, validationError, submitProblem } = props;
  // Display formatting only: a leading "$" the bidder typed isn't doubled. The text is otherwise shown as typed.
  const typedPrice = fields.price.trim().replace(/^\$/, '');
  const typedSetupFee = fields.setupFee.trim().replace(/^\$/, '');
  const symbol = listing.price_currency === 'USD' ? '$' : `${listing.price_currency} `;

  return (
    <Card actions={<BiddingModePill mode={acknowledgedMode ?? currentMode} />} as="aside" className="bid-summary" title="Your offer">
      <Stack gap={4}>
        <div className="bid-summary__price">
          <p className="ui-eyebrow">{isRevision ? 'Revised price' : 'Your price'}</p>
          {typedPrice ? (
            <p className="bid-summary__figure">
              <span className="bid-summary__amount ui-money">{symbol}{typedPrice}</span>
              {/* The period the bidder picked, as its short suffix; the amount is never restated in another period. */}
              <span className="bid-summary__period">{cadenceSuffix(fields.billingFrequency)}</span>
            </p>
          ) : (
            <p className="bid-summary__empty">No price entered yet</p>
          )}
          {typedSetupFee ? <p className="bid-summary__setup">+ {symbol}{typedSetupFee} setup fee</p> : null}
          <p className="bid-summary__current">
            {listing.price_minor === null
              ? <>The business didn’t disclose its price; bid what the work is worth. The listing is {describeBilling(listing.billing_cadence)}.</>
              : <>Listed at <ListedPrice amountMinor={listing.price_minor} currency={listing.price_currency} /> {cadenceSuffix(listing.billing_cadence)}</>}
          </p>
        </div>

        <CoverageSummary fields={fields} idPrefix={formId} listing={listing} />

        <Stack gap={3}>
          <ModeMeaning acknowledgedMode={acknowledgedMode} currentMode={currentMode} onConfirmMode={onConfirmMode} />
          {validationError ? <Callout role="alert" title="Not submitted yet" tone="danger"><p>{validationError}</p></Callout> : null}
          {submitProblem}
          <Button disabled={acknowledgedMode === null} form={formId} isBusy={isSubmitting} isFullWidth size="lg" type="submit" variant="primary">
            {submitLabel(acknowledgedMode, isRevision, isSubmitting)}
          </Button>
          <p className="bid-summary__fineprint">
            {isRevision ? 'Replaces your current offer; earlier versions are kept.' : 'You can revise it until the deadline.'}
          </p>
        </Stack>
      </Stack>
    </Card>
  );
}
