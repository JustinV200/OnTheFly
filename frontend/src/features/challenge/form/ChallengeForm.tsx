/* Collects a challenger's counteroffer: bidding terms first, then price, then the scope it covers.
   Scope inputs are structured so an honest full-scope offer isn't scored as "unstated" by accident.
   The draft lives here, so the page keeps this form mounted while a bidding-mode change awaits re-confirmation.
   Each card of fields is its own component; this file owns the draft, validation, and the submit button. */
import { FormEvent, ReactNode, useState } from 'react';

import { Button, Callout, Card, Cluster, Stack } from '../../../shared/ui';
import type { PublicListingProjection } from '../../publish/types';
import { buildChallengePayload, ChallengeFormFields } from '../buildChallengePayload';
import { fullRequestedScope } from '../fullRequestedScope';
import { BidTicketNote } from '../ticket/BidTicketNote';
import type { BidTicket } from '../ticket/readBidTicket';
import { seedOfferFields } from '../ticket/seedOfferFields';
import type { BiddingModeValue, ChallengePayload, StoredOffer } from '../types';
import { BiddingTermsCallout } from './BiddingTermsCallout';
import { OfferTermsFields } from './OfferTermsFields';
import { PriceFields } from './PriceFields';
import { ScopeFields } from './ScopeFields';
import './ChallengeForm.css';

// The demo scope template's tasks (plan1.md §4). Offered only when a listing names no tasks of its own,
// and labelled as common tasks rather than requested ones; anything else goes in "other inclusions".
const TEMPLATE_TASKS = ['vacuum', 'trash', 'restrooms'];

interface ChallengeFormProps {
  // null while the owner has changed the mode and the challenger hasn't re-confirmed: the draft stays, submitting doesn't.
  acknowledgedMode: BiddingModeValue | null;
  // The listing's mode now, and how the challenger re-confirms it; the terms callout above the price field needs both.
  currentMode: BiddingModeValue;
  onConfirmMode: () => void;
  // The challenger's stored offer, when it has one. The form starts from its terms, because submitting replaces all of them.
  initialOffer: StoredOffer | null;
  // The market page's bid ticket (price and billing), applied over the starting fields; null once this page stored a version.
  ticket: BidTicket | null;
  listing: PublicListingProjection;
  isSubmitting: boolean;
  onSubmit: (payload: ChallengePayload) => Promise<void>;
  // The server's rejection of the last submit, shown right above the submit button; null when there is none.
  submitProblem: ReactNode;
}

/** Render the challenge form. acknowledgedMode must be the mode currently shown to the challenger, or null to block submitting.
    initialOffer and ticket are read once on mount; the page keys this form by stored version so a new version re-seeds it. */
export function ChallengeForm({ acknowledgedMode, currentMode, onConfirmMode, initialOffer, ticket, listing, isSubmitting, onSubmit, submitProblem }: ChallengeFormProps): JSX.Element {
  const requested = fullRequestedScope(listing);
  const isTemplateTasks = requested.tasks.length === 0;
  const taskChoices = isTemplateTasks ? TEMPLATE_TASKS : requested.tasks;

  const [seeded] = useState(() => seedOfferFields(initialOffer, taskChoices, ticket));
  const [fields, setFields] = useState<ChallengeFormFields>(seeded.fields);
  const [validationError, setValidationError] = useState<string | null>(null);
  const update = (patch: Partial<ChallengeFormFields>): void => setFields((current) => ({ ...current, ...patch }));

  // An explicit action, not a default: claiming the full scope is the challenger's decision to make.
  // It copies the listing's own requirements, so the offer is scored against exactly what it claims.
  // With no tasks requested there are none to copy, so any template tasks the challenger ticked stay ticked.
  const matchRequestedScope = (): void => update(isTemplateTasks ? { ...requested, tasks: fields.tasks } : requested);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (acknowledgedMode === null) {
      // The submit button is disabled too; this also covers any other way a form can be submitted.
      return;
    }
    const result = buildChallengePayload(fields, acknowledgedMode);
    if ('error' in result) {
      setValidationError(result.error);
      return;
    }
    setValidationError(null);
    void onSubmit(result.payload);
  };

  return (
    <form className="challenge-form" onSubmit={submit}>
      <Stack gap={5}>
        <Card title="Your price">
          <Stack gap={4}>
            {/* Shown before the price field: a challenger must never find out afterwards that their price went public. */}
            <BiddingTermsCallout
              acknowledgedMode={acknowledgedMode}
              currentMode={currentMode}
              isRevision={initialOffer !== null}
              onConfirmMode={onConfirmMode}
            />
            <PriceFields fields={fields} onChange={update} />
            <BidTicketNote origin={seeded.origin} />
          </Stack>
        </Card>
        <ScopeFields
          fields={fields}
          isTemplateTasks={isTemplateTasks}
          listing={listing}
          onChange={update}
          onMatchRequestedScope={matchRequestedScope}
          taskChoices={taskChoices}
        />
        <OfferTermsFields fields={fields} onChange={update} />

        {validationError ? <Callout role="alert" tone="danger"><p>{validationError}</p></Callout> : null}
        {submitProblem}
        <Cluster justify="start">
          <Button className="challenge-form__submit" disabled={acknowledgedMode === null} isBusy={isSubmitting} size="lg" type="submit" variant="primary">
            {submitLabel(acknowledgedMode, initialOffer !== null, isSubmitting)}
          </Button>
        </Cluster>
      </Stack>
    </form>
  );
}

function submitLabel(acknowledgedMode: BiddingModeValue | null, isRevision: boolean, isSubmitting: boolean): string {
  if (isSubmitting) {
    return 'Submitting…';
  }
  if (acknowledgedMode === null) {
    // The confirm button sits beside the form on wide screens and above it on a phone, so the label names no direction.
    return 'Confirm the new bidding terms to submit';
  }
  // The mode stays in the label so the last thing a challenger reads before clicking is how the price will be shown.
  return `Submit ${acknowledgedMode} ${isRevision ? 'revision' : 'offer'}`;
}
