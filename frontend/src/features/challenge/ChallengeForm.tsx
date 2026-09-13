/* Collects a challenger's counteroffer: bidding terms first, then price, then the scope it covers.
   Scope inputs are structured so an honest full-scope offer isn't scored as "unstated" by accident.
   The draft lives here, so the page keeps this form mounted while a bidding-mode change awaits re-confirmation. */
import { FormEvent, ReactNode, useState } from 'react';

import { TriStateSelect } from '../../shared/components/TriStateSelect';
import { describeScopeExpectations } from '../../shared/format/describeScopeExpectations';
import type { PublicListingProjection } from '../publish/types';
import { buildChallengePayload, ChallengeFormFields } from './buildChallengePayload';
import { fullRequestedScope } from './fullRequestedScope';
import { offerToFormFields } from './offerToFormFields';
import type { BiddingModeValue, ChallengePayload, StoredOffer } from './types';

// The demo scope template's tasks (plan1.md §4). Offered only when a listing names no tasks of its own,
// and labelled as common tasks rather than requested ones; anything else goes in "other inclusions".
const TEMPLATE_TASKS = ['vacuum', 'trash', 'restrooms'];
// Must stay within the backend's BillingFrequency literal (api/challenges/schemas.py).
// Must stay in sync with BillingFrequency in backend/app/api/challenges/schemas.py.
const FREQUENCIES = ['monthly', 'weekly', 'biweekly', 'bimonthly', 'quarterly', 'annual'];

const EMPTY_FIELDS: ChallengeFormFields = {
  price: '',
  billingFrequency: 'monthly',
  tasks: [],
  visitsPerWeek: '',
  equipmentIncluded: null,
  suppliesIncluded: null,
  taxesIncluded: null,
  otherInclusions: '',
  exclusions: '',
  setupFee: '',
  minimumTerm: '',
  availability: '',
  siteVisitRequired: false,
  message: '',
};

interface ChallengeFormProps {
  // null while the owner has changed the mode and the challenger hasn't re-confirmed: the draft stays, submitting doesn't.
  acknowledgedMode: BiddingModeValue | null;
  // The challenger's stored offer, when it has one. The form starts from its terms, because submitting replaces all of them.
  initialOffer: StoredOffer | null;
  listing: PublicListingProjection;
  isSubmitting: boolean;
  onSubmit: (payload: ChallengePayload) => Promise<void>;
}

/** Render the challenge form. acknowledgedMode must be the mode currently shown to the challenger, or null to block submitting.
    initialOffer is read once on mount; the page keys this form by stored version so a new version re-seeds it. */
export function ChallengeForm({ acknowledgedMode, initialOffer, listing, isSubmitting, onSubmit }: ChallengeFormProps): JSX.Element {
  const requested = fullRequestedScope(listing);
  const isTemplateTasks = requested.tasks.length === 0;
  const taskChoices = isTemplateTasks ? TEMPLATE_TASKS : requested.tasks;

  const [fields, setFields] = useState<ChallengeFormFields>(() => (initialOffer ? offerToFormFields(initialOffer, taskChoices) : EMPTY_FIELDS));
  const [validationError, setValidationError] = useState<string | null>(null);
  const update = (patch: Partial<ChallengeFormFields>): void => setFields((current) => ({ ...current, ...patch }));

  // An explicit action, not a default: claiming the full scope is the challenger's decision to make.
  // It copies the listing's own requirements, so the offer is scored against exactly what it claims.
  // With no tasks requested there are none to copy, so any template tasks the challenger ticked stay ticked.
  const matchRequestedScope = (): void => update(isTemplateTasks ? { ...requested, tasks: fields.tasks } : requested);
  // A stored offer can use a frequency this list doesn't name (the API also accepts "yearly"). It is shown as its own
  // option, since a select with no matching option displays the first one while submitting the stored value.
  const frequencyChoices = FREQUENCIES.includes(fields.billingFrequency) ? FREQUENCIES : [...FREQUENCIES, fields.billingFrequency];

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
    <form onSubmit={submit}>
      {/* Shown before the price field: a challenger must never find out afterwards that their price went public.
          A resubmission is a revision, and the server records it under the mode in force now, not the old offer's. */}
      <p role="note" style={{ backgroundColor: acknowledgedMode === 'open' ? '#eff6ff' : '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem' }}>
        {acknowledgedMode === null
          ? '⚠ The bidding terms changed. Confirm the new terms above before submitting; what you typed here is kept.'
          : acknowledgedMode === 'open'
            ? '⚠ Open bidding: your price and scope will be visible to other challengers. Your identity will not.'
            : '🔒 Sealed bidding: only the listing owner sees your price. Your identity is never shown to other challengers.'}{' '}
        {initialOffer ? 'Submitting replaces your current offer with this revision.' : 'If you already have an offer on this listing, this one replaces it.'}
      </p>

      <div style={gridStyle}>
        <Field label="Your price ($)"><input inputMode="decimal" onChange={(event) => update({ price: event.target.value })} placeholder="1875" value={fields.price} /></Field>
        <Field label="Billed">
          <select onChange={(event) => update({ billingFrequency: event.target.value })} value={fields.billingFrequency}>
            {frequencyChoices.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
          </select>
        </Field>
        <Field label="Setup fee ($, blank for none)"><input inputMode="decimal" onChange={(event) => update({ setupFee: event.target.value })} value={fields.setupFee} /></Field>
      </div>

      <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '8px', margin: '1rem 0', padding: '0.5rem 0.75rem' }}>
        <legend>What your price covers</legend>
        <p style={{ margin: '0 0 0.25rem' }}>Requested: {listing.scope_summary}</p>
        <p style={{ margin: '0 0 0.5rem' }}>
          Requested terms: {describeScopeExpectations(listing)}{' '}
          <button onClick={matchRequestedScope} type="button">Offer the full requested scope</button>
        </p>
        <p style={{ color: '#475569', margin: '0 0 0.25rem' }}>
          {isTemplateTasks ? 'This listing names no required tasks. Common cleaning tasks, if your price covers them:' : 'Required tasks your price covers:'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
          {taskChoices.map((task) => (
            <label key={task}>
              <input
                checked={fields.tasks.includes(task)}
                onChange={(event) => update({ tasks: event.target.checked ? [...fields.tasks, task] : fields.tasks.filter((item) => item !== task) })}
                type="checkbox"
              />{' '}
              {task}
            </label>
          ))}
        </div>
        <div style={gridStyle}>
          <Field label="Visits per week (blank: not stated)"><input inputMode="numeric" onChange={(event) => update({ visitsPerWeek: event.target.value })} value={fields.visitsPerWeek} /></Field>
          <TriStateSelect label="Equipment" onChange={(value) => update({ equipmentIncluded: value })} value={fields.equipmentIncluded} />
          <TriStateSelect label="Supplies" onChange={(value) => update({ suppliesIncluded: value })} value={fields.suppliesIncluded} />
          <TriStateSelect label="Taxes" onChange={(value) => update({ taxesIncluded: value })} value={fields.taxesIncluded} />
          <Field label="Other inclusions (comma separated)"><input onChange={(event) => update({ otherInclusions: event.target.value })} value={fields.otherInclusions} /></Field>
          <Field label="Exclusions (comma separated)"><input onChange={(event) => update({ exclusions: event.target.value })} value={fields.exclusions} /></Field>
        </div>
      </fieldset>

      <div style={gridStyle}>
        <Field label="Minimum term"><input onChange={(event) => update({ minimumTerm: event.target.value })} placeholder="e.g. 12 months" value={fields.minimumTerm} /></Field>
        <Field label="Availability"><input onChange={(event) => update({ availability: event.target.value })} placeholder="e.g. can start Oct 1" value={fields.availability} /></Field>
        <Field label="Message to the owner"><input onChange={(event) => update({ message: event.target.value })} value={fields.message} /></Field>
      </div>
      <label style={{ display: 'block', margin: '0.75rem 0' }}>
        <input checked={fields.siteVisitRequired} onChange={(event) => update({ siteVisitRequired: event.target.checked })} type="checkbox" /> Price depends on a site visit
      </label>

      {validationError ? <p role="alert" style={{ color: '#991b1b' }}>{validationError}</p> : null}
      <button disabled={isSubmitting || acknowledgedMode === null} style={{ fontSize: '1.05rem', fontWeight: 700, padding: '0.5rem 1rem' }} type="submit">
        {submitLabel(acknowledgedMode, initialOffer !== null, isSubmitting)}
      </button>
    </form>
  );
}

function submitLabel(acknowledgedMode: BiddingModeValue | null, isRevision: boolean, isSubmitting: boolean): string {
  if (isSubmitting) {
    return 'Submitting…';
  }
  if (acknowledgedMode === null) {
    return 'Confirm the new bidding terms above to submit';
  }
  // The mode stays in the label so the last thing a challenger reads before clicking is how the price will be shown.
  return `Submit ${acknowledgedMode} ${isRevision ? 'revision' : 'offer'}`;
}

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

const gridStyle = { display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' };
