/* Step 3's content: the one button that makes the listing public, disabled until a fresh preview exists, with the reason in words.
   It warns again when the previewed payload names the incumbent vendor, because that is the moment the disclosure happens. */
import { ErrorState } from '../../../shared/components/ErrorState';
import { Button, Callout, Cluster, Stack } from '../../../shared/ui';
import type { ListingPreviewResponse } from '../types';
import type { PublishStep } from '../usePublish';
import './PublishAction.css';

interface PublishActionProps {
  step: PublishStep;
  preview: ListingPreviewResponse | null;
  // A failed publish; shown here only while its preview is still on screen (otherwise the form shows it).
  errorMessage: string | null;
  onPublish: () => void;
}

/** Render the publish button, why it is or isn't available, and any publish failure. */
export function PublishAction({ step, preview, errorMessage, onPublish }: PublishActionProps): JSX.Element {
  const vendorName = preview?.projection.incumbent_vendor_name ?? null;

  return (
    <Stack gap={4}>
      {vendorName ? (
        <Callout role="note" title={`This listing names your current vendor, “${vendorName}”`} tone="warning">
          Publishing it discloses what a third party charges you. Your contract with them may restrict that. Untick “Show the current
          vendor’s name” in step 1 if you aren’t sure.
        </Callout>
      ) : null}
      {errorMessage && preview ? <ErrorState error={null} title={errorMessage} /> : null}
      <Cluster align="center" gap={4}>
        {/* Any form edit clears the preview (usePublish.invalidatePreview), so Publish only ever posts a fresh one. */}
        <Button
          disabled={step !== 'previewing'}
          isBusy={step === 'publishing'}
          onClick={onPublish}
          size="lg"
          variant={preview ? 'primary' : 'secondary'}
        >
          {step === 'publishing' ? 'Publishing…' : 'Publish this listing'}
        </Button>
        <p className="publish-action__reason">{describeAvailability(step, preview !== null)}</p>
      </Cluster>
    </Stack>
  );
}

function describeAvailability(step: PublishStep, hasPreview: boolean): string {
  if (step === 'publishing') {
    return 'Publishing the payload you previewed.';
  }
  if (hasPreview) {
    return 'Changing anything above clears this preview; preview again before publishing. Nothing is public until you click publish.';
  }
  if (step === 'drafting') {
    return 'Available as soon as the preview above is ready. Nothing is public until you click publish.';
  }
  return 'Available once step 2 shows a fresh preview. Nothing is public until you click publish.';
}
