/* The Hackathon demo ledger's row in Data sources: its fixture provenance, whether it has imported, when, and its own
   import or refresh button. Synthetic buyer spend, never labelled or described as Stripe data (CLAUDE.md, data boundaries).
   Only a demo link imports here; Stripe links import from the Stripe sandbox row. */
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Badge, Button, Icon } from '../../../shared/ui';
import { DataSourceSection } from '../../connections/sources/DataSourceSection';
import { sourceLabel } from './describe/sourceLabel';
import { ImportOutcomeNotice } from './ImportOutcomeNotice';
import type { ConnectionStatus, ImportState, LinkedConnection } from './types';

interface DemoLedgerRowProps {
  connection: ConnectionStatus;
  // The demo link that imports through this row.
  ledger: LinkedConnection;
  importState: ImportState;
  onImport: () => void;
}

/** Render the ledger row with its import control and the last import's outcome. */
export function DemoLedgerRow({ connection, ledger, importState, onImport }: DemoLedgerRowProps): JSX.Element {
  const stored = connection.sources.find((source) => source.provider === ledger.provider);
  const hasImported = (stored?.transaction_count ?? 0) > 0;
  const isRunning = importState.phase === 'running';
  // The endpoint's last-import time spans every source, so this row shows it only when the ledger is the only source.
  const isOnlySource = connection.sources.length === 1 && stored !== undefined;
  const hasStripeLink = connection.connections.some((link) => link.imported_through === 'stripe_sync');

  const facts = hasImported
    ? `${stored?.transaction_count} transactions${isOnlySource && connection.last_imported_at ? ` · Last imported ${formatTimestamp(connection.last_imported_at)}` : ''}`
    : 'Ready to import. Every expense arrives private; nothing is published by importing.';

  return (
    <DataSourceSection
      actions={
        // The first import is the one next step on an empty page, so it is primary; a later refresh is secondary.
        <Button isBusy={isRunning} onClick={onImport} variant={hasImported ? 'secondary' : 'primary'}>
          {isRunning ? 'Importing… (everything lands private)' : hasImported ? 'Refresh import' : 'Import transactions'}
        </Button>
      }
      details={
        <>
          <p>Synthetic buyer spend checked into this demo, not from Stripe or a bank.</p>
          <p>
            Importing reads transaction history from ledger account {ledger.provider_account_id}.
            {/* The Stripe row shows its own connection state; this only says where its transactions import. */}
            {hasStripeLink ? ' Stripe sandbox transactions import from the Stripe sandbox row.' : ''}
          </p>
        </>
      }
      facts={facts}
      meta={
        <>
          <ProvenanceBadge kind="financial" value={ledger.provenance} />
          {hasImported
            ? <Badge icon={<Icon name="check" />} tone="success">Imported</Badge>
            : <Badge tone="neutral">Not imported yet</Badge>}
        </>
      }
      title={sourceLabel(ledger.provider, ledger.provenance)}
    >
      <ImportOutcomeNotice importState={importState} />
    </DataSourceSection>
  );
}
