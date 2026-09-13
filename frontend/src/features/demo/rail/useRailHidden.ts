/* Subscribes a component to the demo steps rail's hidden flag, so hiding it on one screen and showing it from the demo
   guide stay in step without a reload. */
import { useCallback, useSyncExternalStore } from 'react';

import { railVisibilityStore } from './railVisibilityStore';

/** Return whether the rail is hidden, and a setter that stores the change. */
export function useRailHidden(): [boolean, (isHidden: boolean) => void] {
  const isHidden = useSyncExternalStore(railVisibilityStore.subscribe, railVisibilityStore.read);
  const setHidden = useCallback((nextIsHidden: boolean) => railVisibilityStore.write(nextIsHidden), []);
  return [isHidden, setHidden];
}
