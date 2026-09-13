/* Composes one business's Spend page: the header, then (once imported) the headline and expense list, then Data sources.
   The answer comes first and where it came from follows (roadmap 11, step 4). Before anything is imported, Data sources
   is the only content and opens its rows, so the import button and its result are still the first thing on the page.
   Privacy is stated once, in the header badge; each row's Visibility column says the rest. */
import type { DemoAccount } from '../../shared/account/demoAccounts';
import { Badge, Icon, PageHeader, Stack } from '../../shared/ui';
import { DataSourcesCard } from '../connections/sources/DataSourcesCard';
import { StripeConnection } from '../connections/StripeConnection';
import { useStripeConnection } from '../connections/useStripeConnection';
import { ConnectionPanel } from './connection/ConnectionPanel';
import { describeImportTotals } from './connection/describe/describeImportTotals';
import { SourcesSummary } from './connection/SourcesSummary';
import { useConnection } from './connection/useConnection';
import { ImportedSpend } from './ImportedSpend';
import { useDashboard } from './useDashboard';

interface OwnerDashboardProps {
  account: DemoAccount;
}

/** Render the acting business's Spend page; the headline and expense list appear only after an import.
    DashboardPage keys this component by account: the Stripe hook loads once on mount, so without a remount a switch
    would keep showing the previous business's connection and imported transactions. */
export function OwnerDashboard({ account }: OwnerDashboardProps): JSX.Element {
  const dashboard = useDashboard();
  const connection = useConnection(dashboard.reload);
  // One Stripe hook for the page: the Stripe sandbox row renders it, and the "no financial account connected" state's
  // primary action starts the same connect, so neither can drift from the other.
  const stripe = useStripeConnection(
    () => {
      // The expense list shows once the connection status reads "imported", which counts
      // stored transactions, so refresh the status as well as the list after a Stripe import.
      connection.status.reload();
      dashboard.reload();
    },
    connection.status.reload,
  );
  const status = connection.status.data;
  const hasImported = status?.status === 'imported';
  // The rows open when they hold the next step or a result: a failed status, nothing imported yet, or an import that ran.
  const shouldOpenSources = status === null
    ? connection.status.error !== null
    : !hasImported || connection.importState.phase !== 'idle';

  return (
    // A section root rather than one Stack: PageHeader brings its own bottom margin, and a gap on top of it doubles the space.
    <section>
      <PageHeader
        meta={
          <Badge icon={<Icon name="lock" />} size="md" tone="private">
            Only {account.businessName} can see this page
          </Badge>
        }
        subtitle="What this business pays for, grouped from its imported transactions."
        title="Spend"
      />

      <Stack gap={8}>
        {hasImported ? <ImportedSpend businessName={account.businessName} dashboard={dashboard} /> : null}
        <DataSourcesCard
          shouldOpen={shouldOpenSources}
          summary={status && hasImported ? <SourcesSummary connection={status} /> : null}
          totals={status ? describeImportTotals(status) : null}
        >
          <ConnectionPanel
            businessName={account.businessName}
            importState={connection.importState}
            isConnectingStripe={stripe.busy}
            onConnectStripe={() => void stripe.connect()}
            onImport={() => void connection.runImport()}
            status={connection.status}
          />
          <StripeConnection stripe={stripe} />
        </DataSourcesCard>
      </Stack>
    </section>
  );
}
