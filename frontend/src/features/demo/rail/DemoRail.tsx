/* The presenter's demo steps rail under the top bar: which step of the task chain is next and a one-click way to do it,
   so a presenter never has to bounce back to the demo guide between steps. This file only decides whether it shows:
   never on the guide itself (which tells the whole story, and would otherwise poll the same views twice), never on the
   public opt-out page an invitation recipient lands on, and not while the presenter has hidden it. */
import { useLocation } from 'react-router-dom';

import { DemoRailStrip } from './DemoRailStrip';
import { useRailHidden } from './useRailHidden';

/** Render the rail when it applies to the current page, or nothing. */
export function DemoRail(): JSX.Element | null {
  const { pathname } = useLocation();
  const [isHidden, setHidden] = useRailHidden();

  if (isHidden || !showsRailOn(pathname)) {
    return null;
  }
  // The strip owns the polling, so returning before it mounts is what keeps a hidden or excluded rail from fetching.
  return <DemoRailStrip onHide={() => setHidden(true)} />;
}

function showsRailOn(pathname: string): boolean {
  const isDemoGuide = pathname === '/demo' || pathname.startsWith('/demo/');
  const isOptOut = pathname.startsWith('/opt-out/');
  return !isDemoGuide && !isOptOut;
}
