/* The three-step publish flow for one business: Scope → Preview → Publish, one step at a time beside the expense card.
   The page holds the draft, so moving between steps never loses it; the publish hook owns every API call. A step without
   a fresh preview behind it can't be shown: any edit discards the preview, and the flow falls back to Scope and says why. */
import { useState } from 'react';

import { parseDollarsToMinor } from '../../../shared/format/parseDollarsToMinor';
import { PublishStep } from '../confirm/PublishStep';
import { ScopeForm } from '../form/ScopeForm';
import { buildDraftPayload } from '../form/state/buildDraftPayload';
import type { ScopeDraft } from '../form/state/useScopeDraft';
import { ScopeFormErrors, validateScopeForm } from '../form/state/validateScopeForm';
import { PreviewStep } from '../preview/PreviewStep';
import { ExpenseSideCard } from '../side/ExpenseSideCard';
import { PublishStepper } from '../stepper/PublishStepper';
import type { WizardStep } from '../stepper/wizardStep';
import type { PublishableExpense } from '../types';
import type { UsePublishResult } from '../usePublish';
import { useStepFocus } from './useStepFocus';
import './PublishWizard.css';

interface PublishWizardProps {
  expenses: PublishableExpense[];
  draft: ScopeDraft;
  publishFlow: UsePublishResult;
}

/** Render the stepper, the expense side card, and whichever step the owner is on. */
export function PublishWizard({ expenses, draft, publishFlow }: PublishWizardProps): JSX.Element {
  const { preview, step, errorMessage, isPreviewStale, createDraft, publish } = publishFlow;
  const [requestedStep, setRequestedStep] = useState<WizardStep>('scope');
  const [errors, setErrors] = useState<ScopeFormErrors>({});
  // Preview and Publish only ever show a preview that still matches the form; without one the owner is on Scope.
  const currentStep: WizardStep = preview ? requestedStep : 'scope';
  const stepRef = useStepFocus<HTMLDivElement>(currentStep);
  const { selectedExpense } = draft;

  const goToPreview = async (): Promise<void> => {
    const nextErrors = validateScopeForm(draft.values, draft.fieldSet);
    setErrors(nextErrors);
    const priceMinor = parseDollarsToMinor(draft.values.currentPrice);
    if (Object.keys(nextErrors).length > 0 || !selectedExpense || priceMinor === null) {
      return;
    }
    if (preview) {
      // Nothing changed since this preview (an edit would have discarded it), so there's no need for another draft version.
      setRequestedStep('preview');
      return;
    }
    const payload = buildDraftPayload({
      expenseId: selectedExpense.id,
      currency: selectedExpense.currency,
      priceMinor,
      values: draft.values,
      choices: draft.choices,
      fieldSet: draft.fieldSet,
    });
    if (await createDraft(payload)) {
      setRequestedStep('preview');
    }
  };

  return (
    <div className="publish-wizard">
      <PublishStepper current={currentStep} isPreviewStale={isPreviewStale} />
      <div className="publish-wizard__layout">
        <div className="publish-wizard__side">
          <ExpenseSideCard expenses={expenses} isPickerEnabled={currentStep === 'scope'} onSelect={draft.selectExpense} selected={selectedExpense} />
        </div>
        <div className="publish-wizard__main" ref={stepRef} tabIndex={-1}>
          {currentStep === 'scope' ? (
            <ScopeForm
              draft={draft}
              errors={errors}
              hasFreshPreview={preview !== null}
              isPreviewStale={isPreviewStale}
              isPublishing={step === 'publishing'}
              isSubmitting={step === 'drafting'}
              onSubmit={() => void goToPreview()}
              // A failure with no preview held came from drafting (or from a publish the owner has since edited), so it belongs by the form.
              serverError={preview ? null : errorMessage}
            />
          ) : null}
          {currentStep === 'preview' && preview ? (
            <PreviewStep onBack={() => setRequestedStep('scope')} onNext={() => setRequestedStep('publish')} preview={preview} />
          ) : null}
          {currentStep === 'publish' && preview ? (
            <PublishStep
              errorMessage={errorMessage}
              isPublishing={step === 'publishing'}
              onBack={() => setRequestedStep('preview')}
              onPublish={() => void publish()}
              preview={preview}
              vendorName={selectedExpense?.vendor ?? 'this listing'}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
