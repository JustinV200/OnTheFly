/* Step 3, Publish: the one button that makes the previewed payload public, named after the expense so the owner knows
   exactly what they are publishing. The incumbent-vendor warning repeats here when the payload names them, because
   this click is the moment of disclosure. Only a fresh preview reaches this step (the flow falls back to Scope otherwise). */
import { BiddingModePill } from '../../../shared/components/BiddingModePill';
import { ErrorState } from '../../../shared/components/ErrorState';
import { ListedPrice } from '../../../shared/components/ListedPrice';
import { categoryLabel } from '../../../shared/format/categoryLabel';
import { cadenceSuffix } from '../../../shared/market';
import { Button, Callout, Card, Icon, Stack } from '../../../shared/ui';
import { StepNavigation } from '../stepper/StepNavigation';
import type { ListingPreviewResponse } from '../types';
import './PublishStep.css';

interface PublishStepProps {
  vendorName: string;
  preview: ListingPreviewResponse;
  isPublishing: boolean;
  // A failed publish, shown right above the button that caused it.
  errorMessage: string | null;
  onBack: () => void;
  onPublish: () => void;
}

/** Render what publishing does, the vendor warning when it applies, any failure, and the named publish button. */
export function PublishStep({ vendorName, preview, isPublishing, errorMessage, onBack, onPublish }: PublishStepProps): JSX.Element {
  const { projection } = preview;
  const isOpen = projection.bidding_mode === 'open';

  return (
    <Card title="Publish">
      <Stack gap={5}>
        <ul className="publish-confirm__facts">
          <li>
            <Icon name="globe" size={18} />
            <span>
              Your <strong>{vendorName}</strong> expense goes public as a <strong>{categoryLabel(projection.category)}</strong> listing at{' '}
              <strong><ListedPrice amountMinor={projection.price_minor} currency={projection.price_currency} /> {cadenceSuffix(projection.billing_cadence)}</strong>,
              exactly as previewed.
            </span>
          </li>
          <li>
            <Icon name="lock" size={18} />
            <span>Every other expense, your transactions, and your connection details stay private.</span>
          </li>
          <li>
            <Icon name={isOpen ? 'eye' : 'lock'} size={18} />
            <span>
              <BiddingModePill mode={projection.bidding_mode} />{' '}
              {isOpen ? 'Offer prices and scope will be public, never who made them.' : 'The public will see only how many offers you get.'}
            </span>
          </li>
          <li>
            <Icon name="arrow-left" size={18} />
            <span>You can unpublish instantly at any time. Offers already received are kept.</span>
          </li>
        </ul>

        {projection.incumbent_vendor_name ? (
          <Callout role="note" title={`This listing names your current vendor, “${projection.incumbent_vendor_name}”`} tone="warning">
            Publishing it discloses what a third party charges you, which your contract with them may restrict. Go back to Scope and untick
            it if you aren’t sure.
          </Callout>
        ) : null}

        {errorMessage ? <ErrorState error={null} title={errorMessage} /> : null}

        <StepNavigation
          back={<Button disabled={isPublishing} iconStart={<Icon name="arrow-left" />} onClick={onBack}>Back to preview</Button>}
          next={(
            <Button iconStart={<Icon name="globe" />} isBusy={isPublishing} onClick={onPublish} size="lg" variant="primary">
              {isPublishing ? 'Publishing…' : `Publish ${vendorName}`}
            </Button>
          )}
        />
      </Stack>
    </Card>
  );
}
