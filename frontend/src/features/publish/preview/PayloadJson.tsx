/* The literal JSON the public API serves for a listing, printed verbatim from the API response, with its payload hash
   (roadmap 09, "The privacy proof"). It scrolls inside its own box so a long payload never widens the page on a phone. */
import { Stack } from '../../../shared/ui';
import type { PublicListingProjection } from '../types';
import './PayloadJson.css';

interface PayloadJsonProps {
  listing: PublicListingProjection;
  payloadHash: string;
  // "preview": before publishing, when the hash guards against a changed payload. "published": what is being served now.
  mode: 'preview' | 'published';
}

/** Render the explanation, JSON block, and payload hash line. */
export function PayloadJson({ listing, payloadHash, mode }: PayloadJsonProps): JSX.Element {
  return (
    <Stack gap={3}>
      <p className="publish-payload__description">
        {mode === 'preview' ? (
          <>
            The public API will serve this payload and nothing else. <code>visibility</code> and <code>published_at</code> are set at the
            moment you publish.
          </>
        ) : (
          'What the public API serves for this listing now.'
        )}
      </p>
      {/* Focusable so keyboard users can scroll a payload wider or taller than its box. */}
      <pre aria-label="Public listing payload (JSON)" className="publish-payload__json" role="region" tabIndex={0}>
        {JSON.stringify(listing, null, 2)}
      </pre>
      <p className="publish-payload__hash">
        Payload hash <code>{payloadHash}</code>
        {mode === 'preview' ? ': publishing is refused if the payload changes after this preview.' : null}
      </p>
    </Stack>
  );
}
