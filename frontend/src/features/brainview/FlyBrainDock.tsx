/* App-wide host for the simulated fly brain. Renders nothing until a fly-brain result publishes a run; then it lazy-loads
   the panel, which lives outside every page, so navigating, opening drawers or clicking away never stops a run.
   It starts minimized to a pill in the corner that names the run ("Fly brain · simulated"), so a run never covers page
   content uninvited but is never hidden either: the pill is the label. The viewer's minimize/expand choice is remembered. */
import { lazy, Suspense, useEffect, useRef, useSyncExternalStore } from 'react';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { clearBrainRuns, readBrainRuns, subscribeToBrainRuns } from '../../shared/flybrain/live';
import { Icon } from '../../shared/ui';
import { useDockPreference } from './useDockPreference';
import './FlyBrainDock.css';

// A separate chunk: the renderer, controls and worker bootstrap load only once there is something to show.
const BrainViewer = lazy(async () => ({ default: (await import('./viewer/BrainViewer')).BrainViewer }));

/** Render the brain panel for the current run, or the labelled pill while it is minimized. */
export function FlyBrainDock(): JSX.Element | null {
  const { current, waiting } = useSyncExternalStore(subscribeToBrainRuns, readBrainRuns);
  const { account } = useActingAccount();
  const [preference, updatePreference] = useDockPreference();
  const previousAccountRef = useRef(account?.id);
  const pillRef = useRef<HTMLButtonElement>(null);
  // Set when the viewer minimizes from the panel, so focus lands on the pill instead of vanishing with the panel.
  const shouldFocusPillRef = useRef(false);

  // A run built from one business's private spend must not keep playing after switching to another business.
  useEffect(() => {
    if (previousAccountRef.current !== account?.id) {
      previousAccountRef.current = account?.id;
      clearBrainRuns();
    }
  }, [account?.id]);

  useEffect(() => {
    if (preference.isMinimized && shouldFocusPillRef.current) {
      shouldFocusPillRef.current = false;
      pillRef.current?.focus();
    }
  }, [preference.isMinimized]);

  if (current === null) {
    return null;
  }

  const runState = current.isFinished ? 'finished' : 'in progress';
  const waitingText = waiting.length > 0 ? ` · ${waiting.length} waiting` : '';

  return (
    <>
      {preference.isMinimized ? (
        <>
          <button className="fly-brain-dock__chip" onClick={() => updatePreference({ isMinimized: false })} ref={pillRef} type="button">
            <Icon name="fly" />
            <span className="fly-brain-dock__label">Fly brain · simulated</span>
            <span className="fly-brain-dock__state">· {runState}{waitingText}</span>
            <span className="ui-visually-hidden">. Show the panel</span>
          </button>
          {/* The panel's own announcements are hidden with it, so the pill states run changes to screen readers instead. */}
          <p aria-live="polite" className="ui-visually-hidden">Simulated fly brain run {runState}.</p>
        </>
      ) : null}
      {/* No loading line while minimized: the pill already says a run exists, and two pills would stack in one corner. */}
      <Suspense fallback={preference.isMinimized ? null : <p className="fly-brain-dock__loading">Opening the fly brain…</p>}>
        <BrainViewer
          isExpanded={preference.isExpanded}
          isHidden={preference.isMinimized}
          onClose={clearBrainRuns}
          onHide={() => {
            shouldFocusPillRef.current = true;
            updatePreference({ isMinimized: true });
          }}
          onToggleExpanded={() => updatePreference({ isExpanded: !preference.isExpanded })}
          run={current}
          waitingCount={waiting.length}
        />
      </Suspense>
    </>
  );
}
