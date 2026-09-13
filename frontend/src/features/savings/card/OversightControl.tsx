/* The owner's oversight cost for managing a piece. Unset keeps the card provisional; setting it recomputes the card on the
   server from its stored inputs, without querying any source again. */
import { useState } from 'react';

import { ApiError, put } from '../../../shared/api/client';
import { formatMinorForInput } from '../../../shared/format/formatMinorForInput';
import { parseDollarsToMinor } from '../../../shared/format/parseDollarsToMinor';
import { Button, Field, Input } from '../../../shared/ui';
import type { SavingsCardView } from '../types';

interface OversightControlProps {
  card: SavingsCardView;
  onSaved: () => void;
}

/** Render the oversight field and its save button. */
export function OversightControl({ card, onSaved }: OversightControlProps): JSX.Element {
  const [text, setText] = useState(card.oversight_minor === null ? '' : formatMinorForInput(card.oversight_minor));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const save = async (): Promise<void> => {
    const trimmed = text.trim();
    const amount = trimmed === '' ? null : parseDollarsToMinor(trimmed);
    if (trimmed !== '' && amount === null) {
      setError('Enter an amount like 12,000, or leave it blank.');
      return;
    }
    setIsSaving(true);
    setError(undefined);
    try {
      await put(`/api/savings-cards/${card.id}/oversight`, { oversight_minor: amount });
      onSaved();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="savings-oversight">
      <Field error={error} hint={card.oversight_minor === null ? 'Unset: the card stays provisional.' : 'Subtracted from modeled savings.'} label={`Your oversight cost per ${card.billing_period} period`}>
        <Input inputMode="decimal" onChange={(event) => setText(event.target.value)} placeholder="e.g. 12,000" value={text} />
      </Field>
      <Button isBusy={isSaving} onClick={() => void save()} size="sm">{isSaving ? 'Saving…' : 'Save'}</Button>
    </div>
  );
}
