/* The visible line under "Data sources" once something is imported: each source's name with its provenance chip and
   transaction count, then when the last import ran. Every count and time is the connection endpoint's; the source rows
   with their import buttons and details wait behind "Manage data sources". */
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Cluster } from '../../../shared/ui';
import { sourceDisplayName } from './describe/sourceDisplayName';
import type { ConnectionStatus } from './types';

interface SourcesSummaryProps {
  connection: ConnectionStatus;
}

/** Render the one-line summary of imported sources. Assumes the connection status is "imported". */
export function SourcesSummary({ connection }: SourcesSummaryProps): JSX.Element {
  return (
    <Cluster gap={3}>
      {connection.sources.map((source) => (
        <Cluster gap={2} key={`${source.provider}:${source.source_type}`}>
          <strong>{sourceDisplayName(source, connection.connections)}</strong>
          <ProvenanceBadge kind="financial" value={source.source_type} />
          <span className="ui-text-muted">
            {source.transaction_count} {source.transaction_count === 1 ? 'transaction' : 'transactions'}
            {source.is_connected ? '' : ' · no longer connected'}
          </span>
        </Cluster>
      ))}
      {connection.last_imported_at ? (
        <span className="ui-text-muted">Last imported {formatTimestamp(connection.last_imported_at)}</span>
      ) : null}
    </Cluster>
  );
}
