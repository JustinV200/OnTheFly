/* Copies a value (usually a public listing link) and says so. If the clipboard is refused, it says that too and
   shows the value to select by hand, rather than pretending the copy worked. */
import { useEffect, useState } from 'react';

import { Icon } from '../icons/Icon';
import { Button } from './Button';
import type { ButtonSize, ButtonVariant } from './buttonClassName';

interface CopyButtonProps {
  value: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

type CopyState = 'idle' | 'copied' | 'failed';

// Long enough to read "Copied", short enough that a second copy isn't confusing.
const RESET_AFTER_MS = 2000;

/** Render a button that copies value to the clipboard. */
export function CopyButton({ value, label = 'Copy link', variant = 'secondary', size = 'md' }: CopyButtonProps): JSX.Element {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state !== 'copied') {
      return undefined;
    }
    const timer = window.setTimeout(() => setState('idle'), RESET_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch (error) {
      // Clipboard access needs a secure context and permission; neither is guaranteed on a demo laptop.
      console.warn('Clipboard write was refused', error);
      setState('failed');
    }
  };

  return (
    <span className="ui-copy-button">
      <Button iconStart={<Icon name={state === 'copied' ? 'check' : 'copy'} size={15} />} onClick={() => void copy()} size={size} variant={variant}>
        <span aria-live="polite">{state === 'copied' ? 'Copied' : label}</span>
      </Button>
      {state === 'failed' ? (
        <span className="ui-text-sm ui-text-muted" role="alert">
          Couldn’t copy. Select it instead: <code>{value}</code>
        </span>
      ) : null}
    </span>
  );
}
