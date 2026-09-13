/* The /publish route: the acting business's publish flow, or a signed-out state for the Public visitor.
   The flow itself lives in flow/OwnerPublishFlow; this file only decides whether there is a business to publish as. */
import { useActingAccount } from '../../shared/account/ActingAccountContext';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader, Stack } from '../../shared/ui';
import { OwnerPublishFlow } from './flow/OwnerPublishFlow';

/** Render the publish flow for the acting business, or a signed-out state. */
export function PublishFlow(): JSX.Element {
  const { account } = useActingAccount();
  if (!account) {
    return (
      <Stack gap={6}>
        {/* No visibility badge: a visitor has no expense whose state could be shown. */}
        <PageHeader subtitle="Businesses publish one expense at a time, after previewing exactly what goes public." title="Publish an expense" />
        <EmptyState title="Signed out: nothing to publish">
          Only a business can publish its own expenses. Pick one in the bar above.
        </EmptyState>
      </Stack>
    );
  }
  return <OwnerPublishFlow account={account} />;
}
