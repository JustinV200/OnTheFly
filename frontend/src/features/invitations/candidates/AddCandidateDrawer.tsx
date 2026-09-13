/* Adds a supplier the owner already knows, beside discovered ones (roadmap 08, step 4). Only the name is required;
   blanks are sent as null so an unanswered field never looks like a known value. "Already contacted by hand" stops the
   system from inviting them again, because an automated duplicate after a real conversation reads as spam. */
import { FormEvent, useState } from 'react';

import { ApiError } from '../../../shared/api/client';
import { ErrorState } from '../../../shared/components/ErrorState';
import { Button, Checkbox, Drawer, Field, Input, Stack, Textarea } from '../../../shared/ui';
import type { NewCandidate } from '../types';

interface AddCandidateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (candidate: NewCandidate) => Promise<void>;
}

const EMPTY = { business_name: '', contact_email: '', website_url: '', phone: '', service_area: '', capability_summary: '' };
const FORM_ID = 'add-candidate-form';

/** Render the add-supplier drawer. */
export function AddCandidateDrawer({ isOpen, onClose, onSubmit }: AddCandidateDrawerProps): JSX.Element {
  const [fields, setFields] = useState(EMPTY);
  const [isContactedOffPlatform, setIsContactedOffPlatform] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const update = (name: keyof typeof EMPTY) => (value: string): void => setFields((current) => ({ ...current, [name]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit({
        business_name: fields.business_name.trim(),
        contact_email: fields.contact_email.trim() || null,
        website_url: fields.website_url.trim() || null,
        phone: fields.phone.trim() || null,
        service_area: fields.service_area.trim() || null,
        capability_summary: fields.capability_summary.trim() || null,
        contacted_off_platform: isContactedOffPlatform,
      });
      setFields(EMPTY);
      setIsContactedOffPlatform(false);
      onClose();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      description="Someone you already know who could do this job. They’ll be invited only if you approve the email."
      footer={
        <>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button disabled={!fields.business_name.trim()} form={FORM_ID} isBusy={isSaving} type="submit" variant="primary">
            {isSaving ? 'Adding…' : 'Add supplier'}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Add a supplier"
    >
      <form id={FORM_ID} onSubmit={(event) => void submit(event)}>
        <Stack gap={4}>
          {error ? <ErrorState error={error} title="Couldn’t add this supplier" /> : null}
          <Field label="Business name">
            <Input autoComplete="organization" onChange={(event) => update('business_name')(event.target.value)} required value={fields.business_name} />
          </Field>
          <Field hint="An address they publish for business inquiries. Without one they can’t be invited by email." label="Contact email">
            <Input autoComplete="email" inputMode="email" onChange={(event) => update('contact_email')(event.target.value)} placeholder="e.g. quotes@example.com" type="email" value={fields.contact_email} />
          </Field>
          <Field label="Website">
            <Input inputMode="url" onChange={(event) => update('website_url')(event.target.value)} placeholder="e.g. example.com" value={fields.website_url} />
          </Field>
          <Field label="Phone">
            <Input autoComplete="tel" inputMode="tel" onChange={(event) => update('phone')(event.target.value)} value={fields.phone} />
          </Field>
          <Field label="Service area">
            <Input onChange={(event) => update('service_area')(event.target.value)} placeholder="e.g. San Francisco Bay Area" value={fields.service_area} />
          </Field>
          <Field label="What they do">
            <Textarea onChange={(event) => update('capability_summary')(event.target.value)} value={fields.capability_summary} />
          </Field>
          <Checkbox
            checked={isContactedOffPlatform}
            hint="They stay on your list but can’t be selected for an automated invitation."
            label="I’ve already contacted them myself"
            onChange={(event) => setIsContactedOffPlatform(event.target.checked)}
          />
        </Stack>
      </form>
    </Drawer>
  );
}
