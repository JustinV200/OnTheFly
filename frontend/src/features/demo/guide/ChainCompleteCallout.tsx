/* The success callout at the top of the demo guide once all eight steps are done, pointing the presenter at the money
   views, where the story's payoff is. It states what happened; whether each figure reconciles is left to the checks
   under the money views, which compare the actual numbers. */
import { Button, Callout, Icon } from '../../../shared/ui';

interface ChainCompleteCalloutProps {
  stepCount: number;
  onShowMoneyViews: () => void;
}

/** Render the "Chain complete" callout. */
export function ChainCompleteCallout({ stepCount, onShowMoneyViews }: ChainCompleteCalloutProps): JSX.Element {
  return (
    <Callout
      actions={(
        <Button iconEnd={<Icon name="arrow-right" size={14} />} onClick={onShowMoneyViews} size="sm" variant="primary">
          See the money views
        </Button>
      )}
      role="status"
      title="Chain complete"
      titleLevel={2}
      tone="success"
    >
      <p>
        All {stepCount} steps are done: GovCon’s task moved to Prime A, and the piece Prime A split off moved to Sub B. The money views
        show each business’s own figures, with checks that compare them.
      </p>
    </Callout>
  );
}
