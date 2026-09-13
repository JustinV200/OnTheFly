/* Step 1, Scope: the four field groups, the gaps list, and "Next: preview". It renders the draft the flow holds and
   reports submit; validation, drafting, and the step change live in the flow, so this stays a presentational form. */
import type { FormEvent } from 'react';

import { ErrorState } from '../../../shared/components/ErrorState';
import { Button, Callout, Card, Icon, Stack } from '../../../shared/ui';
import { StepNavigation } from '../stepper/StepNavigation';
import { BiddingFields } from './bidding/BiddingFields';
import { DemoTemplateBar } from './DemoTemplateBar';
import { WhatYouBuyFields } from './fields/WhatYouBuyFields';
import { WhatYouPayFields } from './fields/WhatYouPayFields';
import { WhereFields } from './fields/WhereFields';
import { listUnansweredQuestions } from './questions/listUnansweredQuestions';
import { UnansweredQuestions } from './questions/UnansweredQuestions';
import type { ScopeDraft } from './state/useScopeDraft';
import type { ScopeFormErrors } from './state/validateScopeForm';

interface ScopeFormProps {
  draft: ScopeDraft;
  errors: ScopeFormErrors;
  // The server's reason the last draft was refused, shown by the Next button so the owner can fix the form.
  serverError: string | null;
  isSubmitting: boolean;
  // Re-drafting while a publish is on the wire would race it on the server.
  isPublishing: boolean;
  // An edit discarded a preview the owner had; say so instead of letting it vanish silently.
  isPreviewStale: boolean;
  // A fresh preview still matches this form, so Next only moves on without drafting again.
  hasFreshPreview: boolean;
  onSubmit: () => void;
}

/** Render the scope form. Every control writes through the draft, which invalidates any preview in the same update. */
export function ScopeForm({ draft, errors, serverError, isSubmitting, isPublishing, isPreviewStale, hasFreshPreview, onSubmit }: ScopeFormProps): JSX.Element {
  const { values, fieldSet, choices, selectedExpense, changeValues, changeChoices, fillDemoTemplate } = draft;
  const hasFieldErrors = Object.keys(errors).length > 0;

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Card description="What you buy, where, and what you pay. Only you see this form." title="Scope">
      <form noValidate onSubmit={submit}>
        <Stack gap={6}>
          {isPreviewStale ? (
            <Callout role="status" title="You changed the scope — preview again" tone="warning">
              <p>The earlier preview no longer matches this form, so it was discarded. Nothing was published.</p>
            </Callout>
          ) : null}
          <DemoTemplateBar onFill={fillDemoTemplate} />
          <WhatYouBuyFields
            bathroomCountError={errors.bathroomCount}
            fieldSet={fieldSet}
            onChange={changeValues}
            squareFootageError={errors.squareFootage}
            values={values}
          />
          <WhereFields examples={fieldSet.examples} onChange={changeValues} values={values} />
          <WhatYouPayFields cadenceError={errors.billingCadence} expense={selectedExpense} onChange={changeValues} priceError={errors.currentPrice} values={values} />
          <BiddingFields choices={choices} onChange={changeValues} onChoicesChange={changeChoices} values={values} />

          <Stack gap={3}>
            <UnansweredQuestions questions={listUnansweredQuestions(values, fieldSet)} />
            {hasFieldErrors ? <Callout role="alert" title="Check the highlighted fields" tone="danger" /> : null}
            {serverError ? <ErrorState error={null} title={serverError} /> : null}
            <StepNavigation
              next={(
                <Button disabled={isPublishing || !selectedExpense} iconEnd={<Icon name="arrow-right" />} isBusy={isSubmitting} size="lg" type="submit" variant="primary">
                  {isSubmitting ? 'Preparing preview…' : hasFreshPreview ? 'Next: preview' : 'Preview what goes public'}
                </Button>
              )}
              note="Previewing publishes nothing."
            />
          </Stack>
        </Stack>
      </form>
    </Card>
  );
}
