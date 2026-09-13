/* Step 1, "Find suppliers": run the configured discovery source once, or add a supplier by hand.
   An unavailable source says "not run" with its reason; a run that found nothing says "no match in this source",
   never "no suppliers exist" (CLAUDE.md, "Evidence and claims"). Discovery never invites anyone. */
import { formatRelativeTime } from '../../../shared/format/formatRelativeTime';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { Badge, Button, Callout, Card, Cluster, Disclosure, Icon, Stack } from '../../../shared/ui';
import type { DiscoveryRun, DiscoveryStatus } from '../types';
import './DiscoveryCard.css';

interface DiscoveryCardProps {
  discovery: DiscoveryStatus;
  isListingPublic: boolean;
  isRunning: boolean;
  onRun: () => void;
  onAddManually: () => void;
}

/** Render the discovery controls and the last run's result. */
export function DiscoveryCard({ discovery, isListingPublic, isRunning, onRun, onAddManually }: DiscoveryCardProps): JSX.Element {
  const { source, last_run: lastRun } = discovery;
  const canRun = source.available && isListingPublic;

  return (
    <Card
      actions={<Badge tone={source.name === 'fixture' ? 'simulated' : 'info'}>{source.label}</Badge>}
      description="Searches use only what your public listing shows, never your vendor’s name. Nothing is sent from here."
      title="1. Find suppliers"
    >
      <Stack gap={4}>
        {source.available ? null : (
          <Callout role="note" title="Web discovery not run" tone="neutral">
            <p>{source.unavailable_reason ?? 'The discovery source is not available.'} You can still add suppliers by hand.</p>
          </Callout>
        )}
        {lastRun ? <LastRun run={lastRun} /> : null}
        <Cluster gap={2}>
          <Button disabled={!canRun} iconStart={<Icon name="search" size={16} />} isBusy={isRunning} onClick={onRun}>
            {isRunning ? 'Searching…' : lastRun ? 'Search again' : 'Search for suppliers'}
          </Button>
          <Button disabled={!isListingPublic} iconStart={<Icon name="plus" size={16} />} onClick={onAddManually} variant="ghost">
            Add a supplier by hand
          </Button>
        </Cluster>
      </Stack>
    </Card>
  );
}

function LastRun({ run }: { run: DiscoveryRun }): JSX.Element {
  if (run.status !== 'ok') {
    return (
      <Callout role="status" title={run.status === 'unavailable' ? 'Last search not run' : 'Last search failed'} tone={run.status === 'error' ? 'danger' : 'neutral'}>
        <p>
          {run.detail ?? 'No detail was recorded.'} <span title={formatTimestamp(run.ran_at)}>({formatRelativeTime(run.ran_at)})</span>
        </p>
      </Callout>
    );
  }
  return (
    <div className="discovery-run">
      <p className="discovery-run__summary">
        <strong>{run.found_count === 0 ? 'No match found in this source' : `${run.found_count} found`}</strong>
        {run.dropped_aggregator_count > 0 ? ` · ${run.dropped_aggregator_count} directory ${run.dropped_aggregator_count === 1 ? 'page' : 'pages'} dropped` : ''}
        {run.merged_duplicate_count > 0 ? ` · ${run.merged_duplicate_count} ${run.merged_duplicate_count === 1 ? 'duplicate' : 'duplicates'} merged` : ''}
        {` · ${run.new_candidate_count} new`}
        <span className="discovery-run__time" title={formatTimestamp(run.ran_at)}> · {formatRelativeTime(run.ran_at)}</span>
      </p>
      {run.detail ? <p className="discovery-run__detail">{run.detail}</p> : null}
      <Disclosure summary={`Searched ${run.queries.length} ${run.queries.length === 1 ? 'phrasing' : 'phrasings'} in ${run.source_label}`}>
        <ul className="discovery-run__queries">
          {run.queries.map((query) => <li key={query}>{query}</li>)}
        </ul>
      </Disclosure>
    </div>
  );
}
