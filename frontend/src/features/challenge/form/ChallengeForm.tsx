/* The bid form as an order ticket: the required parts first (Price, then what the price includes), optional details folded
   under one disclosure, and a sticky "Your offer" summary with the submit button on the right (after the form on a phone).
   The draft lives here, so the page keeps this form mounted while a bidding-mode change awaits re-confirmation. Each
   section is its own component; this file owns the draft, validation, and the layout. */
import { FormEvent, ReactNode, useId, useState } from 'react';

import { Stack } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import { buildChallengePayload, ChallengeFormFields } from '../buildChallengePayload';
import { fullRequestedScope } from '../fullRequestedScope';
import { OfferSummary } from '../summary/OfferSummary';
import { BidTicketNote } from '../ticket/BidTicketNote';
import type { BidTicket } from '../ticket/readBidTicket';
import { seedOfferFields } from '../ticket/seedOfferFields';
import type { BiddingModeValue, ChallengePayload, StoredOffer } from '../types';
import { OfferDetailsFields } from './details/OfferDetailsFields';
import { ModeChangeAlert } from './ModeChangeAlert';
import { PriceFields } from './price/PriceFields';
import { RequirementAnswersFields } from './requirements/RequirementAnswersFields';
import { CoverageFields } from './scope/CoverageFields';
import './ChallengeForm.css';

// The demo scope template's tasks (plan1.md §4). Offered only when a listing names no tasks of its own,
// and labelled as common tasks rather than requested ones; anything else goes in "Also included".
const TEMPLATE_TASKS = ['vacuum', 'trash', 'restrooms'];

interface ChallengeFormProps {
  // null while the business has changed the mode and the bidder hasn't re-confirmed: the draft stays, submitting doesn't.
  acknowledgedMode: BiddingModeValue | null;
  // The listing's mode now, and how the bidder re-confirms it. ModeChangeAlert owns the one confirm button; the
  // summary beside the submit button only says what the mode means.
  currentMode: BiddingModeValue;
  onConfirmMode: () => void;
  // The bidder's stored offer, when it has one. The form starts from its terms, because submitting replaces all of them.
  initialOffer: StoredOffer | null;
  // The market page's bid ticket (price and billing), applied over the starting fields; null once this page stored a version.
  ticket: BidTicket | null;
  listing: PublicListingProjection;
  isSubmitting: boolean;
  onSubmit: (payload: ChallengePayload) => Promise<void>;
  // The server's rejection of the last submit, shown right above the submit button; null when there is none.
  submitProblem: ReactNode;
  // Shown above the first section, e.g. the notice that this form revises a stored offer.
  intro?: ReactNode;
}

/** Render the bid form and its summary. acknowledgedMode must be the mode currently shown to the bidder, or null to
    block submitting. initialOffer and ticket are read once on mount; the page keys this form by stored version so a new
    version re-seeds it. */
export function ChallengeForm(props: ChallengeFormProps): JSX.Element {
  const { acknowledgedMode, currentMode, onConfirmMode, initialOffer, ticket, listing, isSubmitting, onSubmit, submitProblem, intro } = props;
  const formId = useId();
  const requested = fullRequestedScope(listing);
  // A listing scoped as requirement rows is answered requirement by requirement; cleaning keeps its coverage fields.
  const requirements = listing.requirements ?? [];
  const isTemplateTasks = requested.tasks.length === 0;
  const taskChoices = isTemplateTasks ? TEMPLATE_TASKS : requested.tasks;

  const [seeded] = useState(() => seedOfferFields(initialOffer, taskChoices, ticket, listing.billing_cadence));
  const [fields, setFields] = useState<ChallengeFormFields>(seeded.fields);
  const [validationError, setValidationError] = useState<string | null>(null);
  const update = (patch: Partial<ChallengeFormFields>): void => setFields((current) => ({ ...current, ...patch }));

  // An explicit action, not a default: claiming the full scope is the bidder's decision to make.
  // It copies the listing's own requirements, so the offer is scored against exactly what it claims.
  // With no tasks requested there are none to copy, so any template tasks the bidder ticked stay ticked.
  const matchRequestedScope = (): void => update(isTemplateTasks ? { ...requested, tasks: fields.tasks } : requested);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (acknowledgedMode === null) {
      // The submit button is disabled too; this also covers pressing Enter in a field.
      return;
    }
    const result = buildChallengePayload(fields, acknowledgedMode, requirements);
    if ('error' in result) {
      setValidationError(result.error);
      return;
    }
    setValidationError(null);
    void onSubmit(result.payload);
  };

  return (
    <div className="bid-form-layout">
      <form aria-label="Your bid" className="bid-offer-form bid-form-layout__form" id={formId} noValidate onSubmit={submit}>
        <Stack gap={5}>
          {intro}
          {/* Only after a mode change, and before the price field: a bidder must never find out afterwards that their
              price went public. The steady-state mode is in the page header and beside the submit button. */}
          <ModeChangeAlert acknowledgedMode={acknowledgedMode} currentMode={currentMode} isRevision={initialOffer !== null} onConfirmMode={onConfirmMode} />
          <PriceFields
            currency={listing.price_currency}
            fields={fields}
            listingCadence={listing.billing_cadence}
            onChange={update}
            origin={<BidTicketNote origin={seeded.origin} />}
          />
          {requirements.length > 0 ? (
            <RequirementAnswersFields
              answers={fields.requirementAnswers}
              listing={listing}
              onChange={(requirementAnswers) => update({ requirementAnswers })}
            />
          ) : (
            <CoverageFields
              fields={fields}
              isTemplateTasks={isTemplateTasks}
              listing={listing}
              onChange={update}
              onMatchRequestedScope={matchRequestedScope}
              taskChoices={taskChoices}
            />
          )}
          <OfferDetailsFields currency={listing.price_currency} fields={fields} isRequirementListing={requirements.length > 0} onChange={update} />
        </Stack>
      </form>
      <div className="bid-form-layout__summary">
        <OfferSummary
          acknowledgedMode={acknowledgedMode}
          currentMode={currentMode}
          fields={fields}
          formId={formId}
          isRevision={initialOffer !== null}
          isSubmitting={isSubmitting}
          listing={listing}
          submitProblem={submitProblem}
          validationError={validationError}
        />
      </div>
    </div>
  );
}
