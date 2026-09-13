/* The rail's action for the next step. "Do it" switches this tab to the step's business and opens the step's page in one
   click, like the guide's "Act as" buttons. Once the presenter is already there as that business, the button gives way to
   the step's instructions. A step whose page doesn't exist yet sends the presenter to the guide instead. */
import { useLocation, useNavigate } from 'react-router-dom';

import { useActingAccount } from '../../../shared/account/ActingAccountContext';
import { Badge, Button, ButtonLink, Icon } from '../../../shared/ui';
import type { ChainStep } from '../progress/chainSteps';

interface RailStepActionProps {
  step: ChainStep;
}

/** Render the action, or the instructions when the presenter is already on the step's page as its business. */
export function RailStepAction({ step }: RailStepActionProps): JSX.Element {
  const { account, setAccountId } = useActingAccount();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { path } = step;

  if (path === null) {
    return (
      <ButtonLink iconEnd={<Icon name="arrow-right" size={14} />} size="sm" to="/demo" variant="secondary">
        Open the demo guide
      </ButtonLink>
    );
  }

  // Pages under the step's page count (a listing's bid form, a task's inbox), and so do the step's own extra pages.
  const isOnStepPage = pathname === path || pathname.startsWith(`${path}/`) || step.herePrefixes.some((prefix) => pathname.startsWith(prefix));
  if (account?.id === step.actorId && isOnStepPage) {
    // The short form: the rail is one line, and the guide carries the full instruction.
    return (
      <p className="demo-rail__detail">
        <Badge tone="brand">You’re here</Badge> {step.railDetail}
      </p>
    );
  }

  return (
    <Button
      iconEnd={<Icon name="arrow-right" size={14} />}
      onClick={() => {
        // Both in one handler, so the page opens already acting as the step's business (the shell remounts it as that business).
        setAccountId(step.actorId);
        navigate(path);
      }}
      size="sm"
      variant="primary"
    >
      Do it<span className="ui-visually-hidden">: act as {step.actorName} and open this step’s page</span>
    </Button>
  );
}
