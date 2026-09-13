/* Copies a link to the clipboard and says whether it worked, so a blocked clipboard never looks like a silent success. */
import { useState } from 'react';

import { Button, Cluster } from '../../../shared/ui';

type CopyState = 'idle' | 'copied' | 'failed';

interface CopyLinkButtonProps {
  url: string;
}

/** Render a "Copy link" button with a polite status message after each attempt. */
export function CopyLinkButton({ url }: CopyLinkButtonProps): JSX.Element {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const copy = async (): Promise<void> => {
    // Insecure origins and some embedded browsers have no clipboard API at all.
    if (!navigator.clipboard) {
      setCopyState('failed');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
    } catch (error) {
      // The browser refused (permission or focus); anything else is unexpected and should surface.
      if (!(error instanceof DOMException)) {
        throw error;
      }
      setCopyState('failed');
    }
  };

  return (
    <Cluster gap={2}>
      <Button onClick={() => void copy()} size="sm">Copy link</Button>
      <span className="ui-text-muted ui-text-sm" role="status">
        {copyState === 'copied' ? 'Copied.' : null}
        {copyState === 'failed' ? 'Couldn’t copy. Select the address and copy it yourself.' : null}
      </span>
    </Cluster>
  );
}
