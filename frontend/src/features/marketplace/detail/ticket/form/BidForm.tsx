/* The ticket's bid form: a price and a billing period, then on to the full offer form with both prefilled
   (/listings/:id/challenge?price=&billing=), where scope coverage and terms are confirmed before anything is sent.
   The price is parsed only to decide whether it can be passed along; nothing here computes with it. */
import { FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatMinorForInput } from '../../../../../shared/format/formatMinorForInput';
import { parseDollarsToMinor } from '../../../../../shared/format/parseDollarsToMinor';
import { BILLING_OPTIONS, initialBilling } from '../../../../../shared/market';
import { Button, Field, Select } from '../../../../../shared/ui';
import { DollarInput } from './DollarInput';
import './BidForm.css';

interface BidFormProps {
  listingId: string;
  listingCadence: string;
}

/** Render the price and billing fields and the continue button. */
export function BidForm({ listingId, listingCadence }: BidFormProps): JSX.Element {
  const navigate = useNavigate();
  const priceRef = useRef<HTMLInputElement>(null);
  const [priceText, setPriceText] = useState('');
  const [billing, setBilling] = useState(() => initialBilling(listingCadence));
  // Errors wait for a blur or a submit, so "12." mid-typing isn't flagged as wrong.
  const [isErrorShown, setIsErrorShown] = useState(false);

  const trimmed = priceText.trim();
  const priceMinor = trimmed === '' ? null : parseDollarsToMinor(trimmed);
  const priceError = describePriceProblem(trimmed, priceMinor);
  const challengePath = `/listings/${listingId}/challenge`;

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (priceError) {
      setIsErrorShown(true);
      priceRef.current?.focus();
      return;
    }
    if (priceMinor === null) {
      navigate(challengePath);
      return;
    }
    // Canonical "1875.00" rather than what was typed, so the offer form reads one unambiguous format.
    const params = new URLSearchParams({ price: formatMinorForInput(priceMinor), billing });
    navigate(`${challengePath}?${params.toString()}`);
  };

  return (
    <form className="bid-form" noValidate onSubmit={submit}>
      <div className="bid-form__fields">
        <Field error={isErrorShown ? priceError : undefined} label="Your price">
          <DollarInput
            autoComplete="off"
            inputMode="decimal"
            onBlur={() => setIsErrorShown(trimmed !== '')}
            onChange={(event) => setPriceText(event.target.value)}
            // No example figure: a made-up number anchors bids on a listing whose scale it knows nothing about.
            placeholder="Amount in USD"
            ref={priceRef}
            value={priceText}
          />
        </Field>
        <Field label="Billed">
          <Select onChange={(event) => setBilling(event.target.value)} value={billing}>
            {BILLING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>
      </div>
      {/* Above the button, and one fixed label: a label that changed as the price was typed read as a state change. */}
      <p className="bid-form__note">Nothing is sent yet. The next page asks what your offer covers.</p>
      <Button isFullWidth size="lg" type="submit" variant="primary">Continue to your offer</Button>
    </form>
  );
}

function describePriceProblem(trimmed: string, priceMinor: number | null): string | undefined {
  if (trimmed === '') {
    return undefined;
  }
  if (priceMinor === null) {
    return 'Enter an amount like 1,875 or 1875.50.';
  }
  return priceMinor === 0 ? 'Enter a price above $0.' : undefined;
}
