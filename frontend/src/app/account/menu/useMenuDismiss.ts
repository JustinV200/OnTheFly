/* Closes an open popover when the user presses Escape or presses outside it, the two ways people expect to back out. */
import { RefObject, useEffect } from 'react';

/** While isOpen, call onDismiss on Escape (with returnFocus true) or on a pointer press outside rootRef (false). */
export function useMenuDismiss(rootRef: RefObject<HTMLElement>, isOpen: boolean, onDismiss: (returnFocus: boolean) => void): void {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onDismiss(true);
      }
    };
    const handlePointerDown = (event: PointerEvent): void => {
      // A press on the trigger itself is inside rootRef, so the trigger's own toggle handles it.
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        onDismiss(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onDismiss, rootRef]);
}
