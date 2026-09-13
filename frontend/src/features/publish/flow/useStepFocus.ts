/* Moves the owner to the top of a step when the step changes: Next is clicked at the foot of a long form, and
   without this the new step would open scrolled out of sight. Focus follows, so keyboard and screen-reader users land
   on the new step instead of on a button that no longer exists. Not on first render: the page opens where it opens. */
import { RefObject, useEffect, useRef } from 'react';

/** Return a ref for the step container; it is scrolled into view and focused whenever stepKey changes after mount. */
export function useStepFocus<Element extends HTMLElement>(stepKey: string): RefObject<Element> {
  const containerRef = useRef<Element>(null);
  const previousKeyRef = useRef(stepKey);

  useEffect(() => {
    if (previousKeyRef.current === stepKey) {
      return;
    }
    previousKeyRef.current = stepKey;
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The stepper sits just above the container; scrolling the page top keeps it in view with the step.
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    element.focus({ preventScroll: true });
  }, [stepKey]);

  return containerRef;
}
