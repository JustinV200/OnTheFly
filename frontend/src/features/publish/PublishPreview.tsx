/* Renders the actual API preview payload before publication.
   This component does not fabricate fields that the backend did not return. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import type { ListingPreviewResponse } from './types';

interface PublishPreviewProps {
  preview: ListingPreviewResponse | null;
}

/** Render the preview projection returned by the backend publish API. */
export function PublishPreview({ preview }: PublishPreviewProps): JSX.Element {
  if (!preview) {
    return <section><p>Create a draft to preview the public payload.</p></section>;
  }

  return (
    <section>
      <h3>Preview</h3>
      <p>{preview.projection.scope_summary}</p>
      <p><MoneyDisplay amountMinor={preview.projection.price_minor} currency={preview.projection.price_currency} /> / {preview.projection.billing_cadence}</p>
      <p>Bidding mode: {preview.projection.bidding_mode}</p>
      <p>Payload hash: {preview.payload_hash}</p>
    </section>
  );
}
