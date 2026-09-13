/* "Invite suppliers" for one of the owner's listings (roadmap 08): find suppliers, choose, review the exact email,
   approve, then track each invitation. Strictly secondary: an invited supplier lands on the same public listing as
   everyone else, and nothing sends except the approve click in the review drawer. */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { useApiQuery } from '../../shared/api/useApiQuery';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Badge, ButtonLink, Callout, CopyButton, Icon, PageHeader, Stack } from '../../shared/ui';
import { ApprovalDrawer } from './approval/ApprovalDrawer';
import { AddCandidateDrawer } from './candidates/AddCandidateDrawer';
import { CandidateList } from './candidates/CandidateList';
import { DiscoveryCard } from './discovery/DiscoveryCard';
import { outreachOverviewPath } from './outreachApi';
import { ImpliedRateCard } from './rate/ImpliedRateCard';
import { ApprovalResult } from './status/ApprovalResult';
import { InvitationList } from './status/InvitationList';
import { OutreachFunnel } from './status/OutreachFunnel';
import type { OutreachOverview } from './types';
import { useOutreachActions } from './useOutreachActions';

// Picks up a bid from an invited supplier without a manual refresh (polling, not notifications: CLAUDE.md).
const POLL_INTERVAL_MS = 10000;

/** Render the invite-suppliers page for the listing in the URL. */
export function InvitePage(): JSX.Element {
  const { id = '' } = useParams();
  const { account } = useActingAccount();
  const overview = useApiQuery<OutreachOverview>(account ? outreachOverviewPath(id) : null, { pollIntervalMs: POLL_INTERVAL_MS });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const recommendedRunId = overview.data?.discovery.last_run?.id ?? null;
  const recommendedIdsKey = (overview.data?.recommended_candidate_ids ?? []).join('|');
  const appliedRecommendationRun = useRef<string | null>(null);
  const actions = useOutreachActions(id, overview.reload, () => setSelectedIds(new Set()));

  useEffect(() => {
    if (!recommendedRunId || appliedRecommendationRun.current === recommendedRunId) return;
    appliedRecommendationRun.current = recommendedRunId;
    // Apply one default wave per discovery run. Polling or clearing after approval must not select another batch.
    setSelectedIds(new Set(recommendedIdsKey ? recommendedIdsKey.split('|') : []));
  }, [recommendedIdsKey, recommendedRunId]);

  const header = (
    <PageHeader
      eyebrow={<Link to={`/listings/${id}/inbox`}><Icon name="arrow-left" size={14} /> Offers on this listing</Link>}
      meta={overview.data ? (
        <>
          <Badge icon={<Icon name={overview.data.listing_is_public ? 'globe' : 'lock'} />} tone={overview.data.listing_is_public ? 'success' : 'private'}>
            {overview.data.listing_is_public ? 'Listing is public' : 'Listing is private'}
          </Badge>
          <Badge icon={<Icon name="mail" />} tone={overview.data.channel.delivers_real_email ? 'warning' : 'simulated'}>{overview.data.channel.label}</Badge>
        </>
      ) : undefined}
      subtitle="Point businesses that could do this job at your public listing. Nothing is sent until you approve the exact email."
      title="Invite suppliers"
    />
  );

  if (!account) {
    return (
      <Stack gap={6}>
        {header}
        <EmptyState action={<ButtonLink to="/marketplace">Browse markets</ButtonLink>} title="Pick a business to invite suppliers">
          Only a listing’s owner can invite suppliers. Choose it from the business switcher in the top bar.
        </EmptyState>
      </Stack>
    );
  }
  if (!overview.data) {
    return (
      <Stack gap={6}>
        {header}
        {overview.error
          ? <ErrorState error={overview.error} onRetry={overview.reload} title={overview.error.status === 404 ? 'This isn’t one of your listings' : 'Couldn’t load invitations'} />
          : <LoadingSpinner label="Loading suppliers and invitations…" />}
      </Stack>
    );
  }

  const data = overview.data;
  const toggle = (candidateId: string): void => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(candidateId)) {
      next.delete(candidateId);
    } else {
      next.add(candidateId);
    }
    return next;
  });
  // A candidate that became ineligible since it was ticked (e.g. invited in another tab) drops out of the selection.
  const eligibleSelection = new Set(data.candidates.filter((candidate) => candidate.eligibility.can_invite && selectedIds.has(candidate.id)).map((candidate) => candidate.id));

  return (
    <Stack gap={6}>
      {header}
      {overview.error ? <ErrorState error={overview.error} onRetry={overview.reload} title="Showing the last loaded state; a refresh failed" /> : null}
      {data.listing_is_public ? (
        <Callout actions={<CopyButton label="Copy listing link" size="sm" value={data.listing_url} />} role="note" title="Sharing the link yourself works too" tone="neutral">
          <p>Every invitation points to the same public listing anyone can see: <a href={data.listing_url}>{data.listing_url}</a></p>
        </Callout>
      ) : (
        <Callout role="note" title="Publish this listing before inviting suppliers" tone="warning">
          <p>Invitations only point at a live public listing. You can still review suppliers already found.</p>
        </Callout>
      )}
      {actions.actionError ? <ErrorState error={actions.actionError.error} title={actions.actionError.title} /> : null}
      {actions.lastApproval ? <ApprovalResult channel={data.channel} result={actions.lastApproval} /> : null}
      {data.invitations.length > 0 ? <OutreachFunnel channel={data.channel} summary={data.summary} /> : null}

      <ImpliedRateCard rate={data.implied_rate} />

      <DiscoveryCard
        discovery={data.discovery}
        isListingPublic={data.listing_is_public}
        isRunning={actions.busy === 'discover'}
        onAddManually={() => setIsAdding(true)}
        onRun={() => void actions.discover()}
      />
      <CandidateList
        candidates={data.candidates}
        channel={data.channel}
        invitations={data.invitations}
        isPreviewing={actions.busy === 'preview'}
        onPreview={() => void actions.openPreview([...eligibleSelection])}
        onRemove={(candidateId) => void actions.remove(candidateId)}
        onSelectAll={(ids) => setSelectedIds(new Set(ids))}
        onSelectRecommended={(ids) => setSelectedIds(new Set(ids))}
        onToggle={toggle}
        recommendedCandidateIds={data.recommended_candidate_ids}
        removingId={actions.removingId}
        selectedIds={eligibleSelection}
      />
      {data.invitations.length > 0 ? (
        <InvitationList channel={data.channel} invitations={data.invitations} isRetrying={actions.busy === 'retry'} onRetry={() => void actions.retry()} />
      ) : null}

      <AddCandidateDrawer isOpen={isAdding} onClose={() => setIsAdding(false)} onSubmit={actions.add} />
      <ApprovalDrawer
        approveError={actions.approveError}
        isApproving={actions.busy === 'approve'}
        onApprove={() => void actions.approve()}
        onClose={actions.closePreview}
        onRefreshPreview={() => void actions.refreshPreview()}
        preview={actions.preview}
      />
    </Stack>
  );
}
