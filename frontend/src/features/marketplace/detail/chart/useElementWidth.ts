/* Measures an element's content width and follows resizes, so the offer chart can draw at real pixel size: its axis
   text stays legible on a phone instead of shrinking with a scaled viewBox. */
import { RefObject, useEffect, useRef, useState } from 'react';

/** Return a ref to attach and the element's current width, starting from a fallback until the first measurement. */
export function useElementWidth<T extends HTMLElement>(fallbackWidth: number): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallbackWidth);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }
    setWidth(element.clientWidth || fallbackWidth);
    const observer = new ResizeObserver(([entry]) => {
      // Rounded, so sub-pixel layout jitter doesn't re-render the chart on every frame.
      setWidth(Math.round(entry.contentRect.width) || fallbackWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fallbackWidth]);

  return [ref, width];
}
