/* Notices when a fresh preview lands: moves the owner to it and remembers that a preview has been shown,
   so step 2 can say "cleared" rather than "not yet" after an edit discards one. Display only; it never touches the draft. */
import { RefObject, useEffect, useRef, useState } from 'react';

interface PreviewArrival {
  previewRef: RefObject<HTMLDivElement>;
  hasShownPreview: boolean;
}

/** Scroll to and focus the preview step once per new payload hash; a hash seen again (e.g. after a failed publish) doesn't move the page. */
export function usePreviewArrival(payloadHash: string | null, isPreviewing: boolean): PreviewArrival {
  const previewRef = useRef<HTMLDivElement>(null);
  const lastShownHashRef = useRef<string | null>(null);
  const [hasShownPreview, setHasShownPreview] = useState(false);

  useEffect(() => {
    if (!payloadHash) {
      // The preview was cleared (an edit or a new draft), so the next preview is news even if its hash matches.
      lastShownHashRef.current = null;
      return;
    }
    if (!isPreviewing || lastShownHashRef.current === payloadHash) {
      return;
    }
    lastShownHashRef.current = payloadHash;
    setHasShownPreview(true);

    const element = previewRef.current;
    if (!element) {
      return;
    }
    // The preview lands below a long form, out of sight on most screens; without this the click looks like it did nothing.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    element.focus({ preventScroll: true });
  }, [payloadHash, isPreviewing]);

  return { previewRef, hasShownPreview };
}
