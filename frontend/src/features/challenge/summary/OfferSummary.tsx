/* The order ticket's "Your offer" card: the price and frequency exactly as typed, the requested-vs-offered checklist,
   what the bidding mode means for this offer, and the submit button with its mode label. Display only: it normalizes,
   converts, and scores nothing, so it can never disagree with how the server scores the offer. */
import type { ReactNode } from 'react';

import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { cadenceSuffix } from '../../../shared/market';
import { Button, Callout, Card, Stack } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import type { ChallengeFormFields } from '../buildChallengePayload';
import type { BiddingModeValue } from '../types';
import { CoverageChecklist } from './CoverageChecklist';
import { listCoverageRows } from './listCoverageRows';
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
  // Display formatting only: a leading "$" the challenger typed isn't doubled. The text is otherwise shown as typed.
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
              <span className="bid-summary__period">/ {fields.billingFrequency}</span>
            </p>
          ) : (
            <p className="bid-summary__empty">No price entered yet</p>
          )}
          {typedSetupFee ? <p className="bid-summary__setup">+ {symbol}{typedSetupFee} setup fee</p> : null}
          <p className="bid-summary__current">
            They pay now <MoneyDisplay amountMinor={listing.price_minor} currency={listing.price_currency} /> {cadenceSuffix(listing.billing_cadence)}
          </p>
        </div>

        <section aria-labelledby={`${formId}-coverage`} className="bid-summary__section">
          <h3 className="bid-summary__heading" id={`${formId}-coverage`}>Requested vs your offer</h3>
          <CoverageChecklist
            exclusions={fields.exclusions}
            labelId={`${formId}-coverage`}
            otherInclusions={fields.otherInclusions}
            rows={listCoverageRows(listing, fields)}
          />
        </section>

        <ModeMeaning acknowledgedMode={acknowledgedMode} currentMode={currentMode} onConfirmMode={onConfirmMode} />

        <Stack gap={3}>
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
