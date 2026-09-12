/* Collects a challenger's counteroffer: bidding terms first, then price, then the scope it covers.
   Scope inputs are structured so an honest full-scope offer isn't scored as "unstated" by accident. */
import { FormEvent, ReactNode, useState } from 'react';

import { TriStateSelect } from '../../shared/components/TriStateSelect';
import { buildChallengePayload, ChallengeFormFields } from './buildChallengePayload';
import type { BiddingModeValue, ChallengePayload } from './types';

// The cleaning tasks the demo scope template names; anything else goes in "other inclusions".
const STANDARD_TASKS = ['vacuum', 'trash', 'restrooms'];
// Must stay within the backend's BillingFrequency literal (api/challenges/schemas.py).
// Must stay in sync with BillingFrequency in backend/app/api/challenges/schemas.py.
const FREQUENCIES = ['monthly', 'weekly', 'biweekly', 'bimonthly', 'quarterly', 'annual'];

interface ChallengeFormProps {
  acknowledgedMode: BiddingModeValue;
  scopeSummary: string;
  isSubmitting: boolean;
  onSubmit: (payload: ChallengePayload) => Promise<void>;
}

/** Render the challenge form; acknowledgedMode must be the mode currently shown to the challenger. */
export function ChallengeForm({ acknowledgedMode, scopeSummary, isSubmitting, onSubmit }: ChallengeFormProps): JSX.Element {
  const [fields, setFields] = useState<ChallengeFormFields>({
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
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const update = (patch: Partial<ChallengeFormFields>): void => setFields((current) => ({ ...current, ...patch }));

  // An explicit action, not a default: claiming the full scope is the challenger's decision to make.
  const matchRequestedScope = (): void => {
    const requestedVisits = /(\d+)x\s+weekly/i.exec(scopeSummary)?.[1] ?? '';
    update({ tasks: STANDARD_TASKS, visitsPerWeek: requestedVisits, equipmentIncluded: true, suppliesIncluded: true, taxesIncluded: true });
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
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
      {/* Shown before the price field: a challenger must never find out afterwards that their price went public. */}
      <p role="note" style={{ backgroundColor: acknowledgedMode === 'open' ? '#eff6ff' : '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem' }}>
        {acknowledgedMode === 'open'
          ? '⚠ Open bidding: your price and scope will be visible to other challengers. Your identity will not.'
          : '🔒 Sealed bidding: only the listing owner sees your price. Your identity is never shown to other challengers.'}
      </p>

      <div style={gridStyle}>
        <Field label="Your price ($)"><input inputMode="decimal" onChange={(event) => update({ price: event.target.value })} placeholder="1875" value={fields.price} /></Field>
        <Field label="Billed">
          <select onChange={(event) => update({ billingFrequency: event.target.value })} value={fields.billingFrequency}>
            {FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
          </select>
        </Field>
        <Field label="Setup fee ($, blank for none)"><input inputMode="decimal" onChange={(event) => update({ setupFee: event.target.value })} value={fields.setupFee} /></Field>
      </div>

      <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '8px', margin: '1rem 0', padding: '0.5rem 0.75rem' }}>
        <legend>What your price covers</legend>
        <p style={{ margin: '0 0 0.5rem' }}>
          Requested: {scopeSummary}{' '}
          <button onClick={matchRequestedScope} type="button">Offer the full requested scope</button>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
          {STANDARD_TASKS.map((task) => (
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
      <button disabled={isSubmitting} style={{ fontSize: '1.05rem', fontWeight: 700, padding: '0.5rem 1rem' }} type="submit">
        {isSubmitting ? 'Submitting…' : `Submit ${acknowledgedMode} offer`}
      </button>
    </form>
  );
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
