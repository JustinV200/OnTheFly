/* Step 2, Preview: the draft rendered with the marketplace's own MarketCard, so the preview is literally what a stranger
   sees, beside the "Never public" list, with the exact JSON and payload hash one click away (the privacy proof, roadmap
   09). The JSON starts collapsed on every width so the rendered listing reads first; it is always one click away.
   Everything shown comes from the server's preview payload, never from the form. */
import { MarketCard } from '../../../shared/market';
import { Button, Card, Disclosure, Icon, Stack } from '../../../shared/ui';
import { StepNavigation } from '../stepper/StepNavigation';
import type { ListingPreviewResponse } from '../types';
import { ListingPageDetails } from './ListingPageDetails';
import { NeverPublicList } from './NeverPublicList';
import { PayloadJson } from './PayloadJson';
import './PreviewStep.css';

interface PreviewStepProps {
  preview: ListingPreviewResponse;
  onBack: () => void;
  onNext: () => void;
}

/** Render the rendered preview, the never-public list, the payload disclosure, and Back / Next. */
export function PreviewStep({ preview, onBack, onNext }: PreviewStepProps): JSX.Element {
  return (
    <Card description="This is exactly what a stranger will see." title="Preview">
      <Stack gap={6}>
        <div className="publish-preview__grid">
          <Stack gap={5}>
            <section aria-labelledby="publish-preview-card" className="publish-preview__group">
              <h3 className="publish-preview__label" id="publish-preview-card">On the market board</h3>
              {/* No offer count: a draft can't have offers yet, and inventing "0 offers" would be a claim. */}
              <MarketCard listing={preview.projection} offerCount={null} />
            </section>
            <section aria-labelledby="publish-preview-page" className="publish-preview__group">
              <h3 className="publish-preview__label" id="publish-preview-page">Also on the listing page</h3>
              <ListingPageDetails listing={preview.projection} />
            </section>
          </Stack>
          <NeverPublicList />
        </div>

        <Disclosure summary="Show the exact payload the public API will serve" variant="card">
          <PayloadJson listing={preview.projection} mode="preview" payloadHash={preview.payload_hash} />
        </Disclosure>

        <StepNavigation
          back={<Button iconStart={<Icon name="arrow-left" />} onClick={onBack}>Back to scope</Button>}
          next={<Button iconEnd={<Icon name="arrow-right" />} onClick={onNext} size="lg" variant="primary">Next: publish</Button>}
          note="Changing the scope discards this preview."
        />
      </Stack>
    </Card>
  );
}
