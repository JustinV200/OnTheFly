/* Brings a region into view and moves keyboard focus to it when a caller asks, e.g. a "Review offers" button above a
   tab whose offer list loads asynchronously. The caller holds the request and clears it in onHandled, so the hook waits
   until the region is ready (its data loaded) and acts exactly once; a later remount of the region doesn't jump again. */
import { RefObject, useEffect } from 'react';

/** Scroll to and focus the element while isRequested, as soon as isReady is true, then call onHandled. */
export function useFocusOnRequest(ref: RefObject<HTMLElement>, isRequested: boolean, isReady: boolean, onHandled: () => void): void {
  useEffect(() => {
    const element = ref.current;
    if (!isRequested || !isReady || !element) {
      return;
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    // preventScroll: the scroll above already placed it; a second jump would cancel the smooth scroll.
    element.focus({ preventScroll: true });
    onHandled();
  }, [ref, isRequested, isReady, onHandled]);
}
