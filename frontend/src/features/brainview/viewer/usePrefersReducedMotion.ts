/* Reports whether the device asks for reduced motion, updating if the setting changes while the page is open. */
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Return true when the operating system's reduced-motion setting is on. */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const onChange = (): void => setPrefersReducedMotion(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return prefersReducedMotion;
}
