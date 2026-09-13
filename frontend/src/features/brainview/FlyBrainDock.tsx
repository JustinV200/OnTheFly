/* App-wide host for the simulated fly brain. Renders nothing until a fly-brain result publishes a run; then it lazy-loads
   the panel, which lives outside every page, so navigating, opening drawers or clicking away never stops a run. */
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { clearBrainRuns, readBrainRuns, subscribeToBrainRuns } from '../../shared/flybrain/live';
import { Icon } from '../../shared/ui';
import './FlyBrainDock.css';

// A separate chunk: the renderer, controls and worker bootstrap load only once there is something to show.
const BrainViewer = lazy(async () => ({ default: (await import('./viewer/BrainViewer')).BrainViewer }));

/** Render the brain panel for the current run, or a chip while the panel is hidden. */
export function FlyBrainDock(): JSX.Element | null {
  const { current, waiting } = useSyncExternalStore(subscribeToBrainRuns, readBrainRuns);
  const { account } = useActingAccount();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const previousAccountRef = useRef(account?.id);

  // A run built from one business's private spend must not keep playing after switching to another business.
  useEffect(() => {
    if (previousAccountRef.current !== account?.id) {
      previousAccountRef.current = account?.id;
      clearBrainRuns();
    }
  }, [account?.id]);

  // A new run shows the panel again even if the previous one was hidden.
  useEffect(() => {
    setIsHidden(false);
  }, [current?.id]);

  if (current === null) {
    return null;
  }

  return (
    <>
      {isHidden ? (
        <button className="fly-brain-dock__chip" onClick={() => setIsHidden(false)} type="button">
          <Icon name="fly" />
          <span>{current.isFinished ? 'Show the fly brain' : 'Fly brain running · show'}</span>
        </button>
      ) : null}
      <Suspense fallback={<p className="fly-brain-dock__loading">Opening the fly brain…</p>}>
        <BrainViewer
          isExpanded={isExpanded}
          isHidden={isHidden}
          onClose={clearBrainRuns}
          onHide={() => setIsHidden(true)}
          onToggleExpanded={() => setIsExpanded((expanded) => !expanded)}
          run={current}
          waitingCount={waiting.length}
        />
      </Suspense>
    </>
  );
}
