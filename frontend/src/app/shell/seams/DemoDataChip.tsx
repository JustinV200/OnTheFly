/* States the demo's seams in the top bar on every screen: what the financial data is and whether any offer is genuine.
   The chip itself names both facts ("Fixture spend · 2 simulated offers"); pressing it opens the full sentences.
   When the status can't load it turns danger-toned and says so, never hidden (roadmap 11, "Demo-data chip"). */
import { useCallback, useId, useRef, useState } from 'react';

import { useApiQuery } from '../../../shared/api/useApiQuery';
import { Icon, Spinner } from '../../../shared/ui';
import { useMenuDismiss } from '../../account/menu/useMenuDismiss';
import { describeFinancial, describeOffers, describeOutreach, describeSeamsShort, isSimulated } from './describeSeams';
import type { DemoStatus } from './demoStatusTypes';
import './DemoDataChip.css';

// The endpoint is a few counts, so a short poll is cheap and keeps the label current right after an offer lands.
const POLL_INTERVAL_MS = 5000;

/** Render the demo-data chip and its explanation panel. */
export function DemoDataChip(): JSX.Element {
  const { data, error } = useApiQuery<DemoStatus>('/api/demo/status', { pollIntervalMs: POLL_INTERVAL_MS });
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback((returnFocus: boolean): void => {
    setIsOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);
  useMenuDismiss(rootRef, isOpen, close);

  const tone = !data ? (error ? 'danger' : 'loading') : isSimulated(data) ? 'simulated' : 'neutral';
  const label = !data ? (error ? 'Data labels unavailable' : 'Checking data sources…') : describeSeamsShort(data);

  return (
    <div className="demo-chip" ref={rootRef}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        className={`demo-chip__trigger demo-chip__trigger--${tone}`}
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        {tone === 'loading' ? <Spinner size="sm" /> : <Icon name={tone === 'danger' ? 'alert-circle' : 'alert-triangle'} size={14} />}
        <span className="demo-chip__label">{label}</span>
      </button>

      {isOpen ? (
        <div aria-label="Where this demo's data comes from" className="demo-chip__panel" id={panelId} role="region">
          {data ? (
            <dl className="demo-chip__facts">
              <dt>Financial data</dt>
              <dd>{describeFinancial(data.financial.provenance)}</dd>
              <dt>Counteroffers</dt>
              <dd>{describeOffers(data.offers)}</dd>
              {data.outreach ? (
                <>
                  <dt>Supplier invitations</dt>
                  <dd>{describeOutreach(data.outreach)}</dd>
                </>
              ) : null}
            </dl>
          ) : (
            <p className="demo-chip__error">
              {error ? `Couldn’t load the demo data labels (${error.message}). Treat every figure as unverified.` : 'Checking…'}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
