/* Composes one business's Spend page: the header, then (once imported) the headline and expense list, then Data sources.
   The answer comes first and where it came from follows (roadmap 11, step 4). Before anything is imported, Data sources
   is the only content, so the import button and its result are still the first thing on the page. */
import type { DemoAccount } from '../../shared/account/demoAccounts';
import { Badge, Icon, PageHeader, Stack } from '../../shared/ui';
import { DataSourcesCard } from '../connections/sources/DataSourcesCard';
import { StripeConnection } from '../connections/StripeConnection';
import { ConnectionPanel } from './connection/ConnectionPanel';
import { describeImportTotals } from './connection/describe/describeImportTotals';
import { useConnection } from './connection/useConnection';
import { ImportedSpend } from './ImportedSpend';
import { useDashboard } from './useDashboard';

interface OwnerDashboardProps {
  account: DemoAccount;
}

/** Render the acting business's Spend page; the headline and expense list appear only after an import. */
export function OwnerDashboard({ account }: OwnerDashboardProps): JSX.Element {
  const dashboard = useDashboard();
  const connection = useConnection(dashboard.reload);
  const hasImported = connection.status.data?.status === 'imported';

  return (
    // A section root rather than one Stack: PageHeader brings its own bottom margin, and a gap on top of it doubles the space.
    <section>
      <PageHeader
        meta={
          <Badge icon={<Icon name="lock" />} size="md" tone="private">
            Only {account.businessName} can see this page
          </Badge>
        }
        subtitle="Everything imports private. Nothing goes public unless you publish that one expense."
        title="Spend"
      />

      <Stack gap={8}>
        {hasImported ? <ImportedSpend businessName={account.businessName} dashboard={dashboard} sources={connection.status.data?.sources ?? []} /> : null}
        <DataSourcesCard summary={connection.status.data ? describeImportTotals(connection.status.data) : null}>
          <ConnectionPanel
            businessName={account.businessName}
            importState={connection.importState}
            onImport={() => void connection.runImport()}
            status={connection.status}
          />
          {/* Keyed by account: the Stripe hook loads once on mount, so without a remount a switch would
              keep showing the previous business's connection and imported transactions. */}
          <StripeConnection
            key={account.id}
            onConnected={connection.status.reload}
            onImported={() => {
              // The expense list shows once the connection status reads "imported", which counts
              // stored transactions, so refresh the status as well as the list after a Stripe import.
              connection.status.reload();
              dashboard.reload();
            }}
          />
        </DataSourcesCard>
      </Stack>
    </section>
  );
}
