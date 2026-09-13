/* Reports that a polled figure just changed, for a brief highlight, so the audience's eye finds the number that moved.
   The first value never flashes: only a change between polls does. */
import { useEffect, useRef, useState } from 'react';

// Long enough to notice across a room, short enough to be gone before the next 4-second poll.
const FLASH_MS = 1600;

/** Return true for a moment after value changes from what the previous render showed. */
export function useChangeFlash(value: number | null): boolean {
  const previousRef = useRef(value);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (previousRef.current === value) {
      return undefined;
    }
    previousRef.current = value;
    setIsFlashing(true);
    const timer = window.setTimeout(() => setIsFlashing(false), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  return isFlashing;
}
