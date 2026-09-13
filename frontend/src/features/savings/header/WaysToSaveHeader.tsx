/* The top of Ways to save: title, market-data source, how many suggested pieces this task has used, and Refresh
   evidence. How suggestions are decided (segments, keep cost, cut, the configured thresholds) is one click away; every
   card still prints its own thresholds in its pass line. */
import { formatMoneyText } from '../../../shared/format/formatMoneyText';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { Badge, Button, Callout, Card, Cluster, Disclosure, Icon, Stack } from '../../../shared/ui';
import type { WaysToSaveResponse } from '../types';
import { MarketSourceBadge } from './MarketSourceBadge';

interface WaysToSaveHeaderProps {
  data: WaysToSaveResponse;
  computedAt: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  errorMessage: string | null;
}

/** Render the panel header card. */
export function WaysToSaveHeader({ data, computedAt, isRefreshing, onRefresh, errorMessage }: WaysToSaveHeaderProps): JSX.Element {
  const { thresholds } = data;
  const isCapReached = data.active_suggested_pieces >= data.max_suggested_pieces;

  return (
    <Card
      actions={(
        <Button iconStart={<Icon name="search" />} isBusy={isRefreshing} onClick={onRefresh} size="sm">
          {isRefreshing ? 'Querying…' : 'Refresh evidence'}
        </Button>
      )}
      title="Ways to save"
    >
      <Stack gap={3}>
        <Cluster gap={2}>
          <MarketSourceBadge source={data.market_data_source} />
          <Badge size="md" tone="neutral">{data.active_suggested_pieces} of {data.max_suggested_pieces} suggested pieces used</Badge>
          {computedAt ? <span className="ui-text-xs ui-text-muted">Computed {formatTimestamp(computedAt)}</span> : null}
        </Cluster>
        <Disclosure summary="How suggestions are decided">
          <Stack gap={2}>
            <p className="ui-text-sm">
              Requirements are grouped by confirmed labor category, PSC and NAICS. For each group, keep cost uses your own
              rates, and the suggested cut uses the median market rate for the same hours.
            </p>
            <p className="ui-text-sm">
              A group is suggested only when potential savings reach {(thresholds.min_basis_points / 100).toFixed(0)}% of keep
              cost and {formatMoneyText(thresholds.min_annual_minor, 'USD')} a year, at least {thresholds.min_suppliers} distinct
              suppliers by UEI appear over {thresholds.lookback_years} years, and the cut fits your remainder. Thresholds come
              from configuration and are never tuned per task. At most {thresholds.max_suggested_pieces_per_task} suggested
              pieces per task; manual splits don’t count.
            </p>
          </Stack>
        </Disclosure>
        {isCapReached ? (
          <Callout role="note" title="Suggestion cap reached" tone="warning">
            <p>This task already has {data.max_suggested_pieces} suggested pieces. You can still split off pieces manually.</p>
          </Callout>
        ) : null}
        {errorMessage ? <Callout role="alert" title="That didn’t work" tone="danger"><p>{errorMessage}</p></Callout> : null}
      </Stack>
    </Card>
  );
}
