/* Shows the exact public payload the API returned for this draft, field for field, before anything is published.
   It renders the backend's JSON verbatim beside a readable summary and invents no field (roadmap 09, "The privacy proof"). */
import { Grid, Stack } from '../../../shared/ui';
import type { ListingPreviewResponse } from '../types';
import { NeverPublicList } from './NeverPublicList';
import { PayloadJson } from './PayloadJson';
import { PublicListingSummary } from './PublicListingSummary';

interface PublishPreviewProps {
  preview: ListingPreviewResponse;
}

/** Render the readable summary and "Never public" list beside the verbatim payload (stacked on a phone). */
export function PublishPreview({ preview }: PublishPreviewProps): JSX.Element {
  return (
    <Grid gap={6} minItemWidth="340px">
      <Stack gap={5}>
        <PublicListingSummary listing={preview.projection} />
        <NeverPublicList />
      </Stack>
      <PayloadJson listing={preview.projection} mode="preview" payloadHash={preview.payload_hash} />
    </Grid>
  );
}
