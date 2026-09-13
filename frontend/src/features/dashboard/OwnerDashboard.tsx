/* Composes one business's private dashboard: the page header, its data sources, then its expenses once imported.
   Data sources come first on every state, so an import's result appears beside the button that started it. */
import type { DemoAccount } from '../../shared/account/demoAccounts';
import { Badge, Icon, PageHeader, Stack } from '../../shared/ui';
import { DataSourcesCard } from '../connections/sources/DataSourcesCard';
import { StripeConnection } from '../connections/StripeConnection';
import { ConnectionPanel } from './connection/ConnectionPanel';
import { useConnection } from './connection/useConnection';
import { ExpenseList } from './expenses/ExpenseList';
import { useDashboard } from './useDashboard';

interface OwnerDashboardProps {
  account: DemoAccount;
}

/** Render the acting business's dashboard; the expense list appears only after an import. */
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

      <Stack gap={6}>
        <DataSourcesCard>
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

        {hasImported ? <ExpenseList businessName={account.businessName} dashboard={dashboard} /> : null}
      </Stack>
    </section>
  );
}
