/* "Add details (optional)": what an offer can state beyond its price and scope, folded under one disclosure so the
   required price and requirement answers read first. Setup fee, minimum term, availability, the site-visit condition
   (only where it applies), and a message only the business reads. It starts open when any of them already has a value,
   typically a revision, so a stated term is never tucked away. Blank text is sent as not stated, never as an empty promise. */
import { useState } from 'react';

import { Checkbox, Disclosure, Field, Grid, Input, Stack } from '../../../../shared/ui';
import type { ChallengeFormFields } from '../../buildChallengePayload';
import { PrefixedInput } from '../price/PrefixedInput';

interface OfferDetailsFieldsProps {
  fields: ChallengeFormFields;
  onChange: (patch: Partial<ChallengeFormFields>) => void;
  // The listing's currency, which the setup fee is stored in; "$" is drawn only for USD.
  currency: string;
  // True for a listing scoped as requirement rows; the site-visit condition belongs to older on-site scope listings.
  isRequirementListing: boolean;
}

/** Render the optional details disclosure. Its open state is read from fields once, on mount. */
export function OfferDetailsFields({ fields, onChange, currency, isRequirementListing }: OfferDetailsFieldsProps): JSX.Element {
  // Read once: the form is re-keyed per stored version, so mount is when the starting values are known. Recomputing on
  // every keystroke would snap the section shut under the bidder the moment they cleared its last field.
  const [isInitiallyOpen] = useState(() => hasAnyDetail(fields));
  // A requirement listing still shows the box when a stored offer ticked it, so a revision can see and untick it
  // instead of resending a condition the bidder can't see.
  const isSiteVisitShown = !isRequirementListing || fields.siteVisitRequired;
  const prefix = currency === 'USD' ? '$' : `${currency} `;

  return (
    <Disclosure isDefaultOpen={isInitiallyOpen} summary="Add details (optional)" variant="card">
      <Stack gap={4}>
        <Grid minItemWidth="12rem">
          <Field hint={`Leave blank for none. ${currency === 'USD' ? 'In US dollars' : `In ${currency}`}.`} label="Setup fee">
            <PrefixedInput
              inputMode="decimal"
              onChange={(event) => onChange({ setupFee: event.target.value })}
              placeholder={`Amount in ${currency}`}
              prefix={prefix}
              value={fields.setupFee}
            />
          </Field>
          <Field hint="Blank means not stated" label="Minimum term">
            <Input onChange={(event) => onChange({ minimumTerm: event.target.value })} placeholder="e.g. 12 months" value={fields.minimumTerm} />
          </Field>
          <Field hint="Blank means not stated" label="Availability">
            <Input onChange={(event) => onChange({ availability: event.target.value })} placeholder="e.g. can start Oct 1" value={fields.availability} />
          </Field>
        </Grid>
        {isSiteVisitShown ? (
          <Checkbox
            checked={fields.siteVisitRequired}
            hint="Tick if the business should expect the price to change after you see the site."
            label="Price depends on a site visit"
            onChange={(event) => onChange({ siteVisitRequired: event.target.checked })}
          />
        ) : null}
        {/* Kept a single-line input: a textarea would start sending line breaks the owner's views don't render.
            Only the poster reads it; the public leaderboard carries no messages in either bidding mode. */}
        <Field hint="Only the business that posted this task sees it." label="Message to the business">
          <Input onChange={(event) => onChange({ message: event.target.value })} placeholder="e.g. How you’d staff it, or relevant past work" value={fields.message} />
        </Field>
      </Stack>
    </Disclosure>
  );
}

function hasAnyDetail(fields: ChallengeFormFields): boolean {
  return [fields.setupFee, fields.minimumTerm, fields.availability, fields.message].some((text) => text.trim() !== '') || fields.siteVisitRequired;
}
