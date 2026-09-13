/* The task's constraints, each carried into the piece by default (plan2, "Flow-down"). Unticking one removes it from the
   piece, which is warned about and needs an explicit acknowledgement; the server audits every removal. */
import { Badge, Callout, Checkbox } from '../../../shared/ui';
import { constraintLabel } from '../../marketplace/detail/tabs/constraintLabel';
import type { ConstraintRow } from '../../tasks/types';

interface ConstraintFlowDownProps {
  constraints: ConstraintRow[];
  removed: Array<{ kind: string; value: string }>;
  onChange: (removed: Array<{ kind: string; value: string }>) => void;
  isAcknowledged: boolean;
  onAcknowledge: (isAcknowledged: boolean) => void;
}

/** Render one checkbox per constraint, and the removal warning while any is unticked. */
export function ConstraintFlowDown({ constraints, removed, onChange, isAcknowledged, onAcknowledge }: ConstraintFlowDownProps): JSX.Element {
  const isRemoved = (constraint: ConstraintRow): boolean => removed.some((item) => item.kind === constraint.kind && item.value === constraint.value);
  const toggle = (constraint: ConstraintRow, isKept: boolean): void => {
    onChange(isKept ? removed.filter((item) => !(item.kind === constraint.kind && item.value === constraint.value)) : [...removed, { kind: constraint.kind, value: constraint.value }]);
  };

  return (
    <fieldset className="split-drawer__fieldset">
      <legend className="split-drawer__legend">Constraints that flow down to the piece</legend>
      {constraints.length === 0 ? <p className="ui-text-muted ui-text-sm">This task has no constraints to carry.</p> : null}
      {constraints.map((constraint) => (
        <Checkbox
          checked={!isRemoved(constraint)}
          key={`${constraint.kind}:${constraint.value}`}
          label={<><Badge tone="warning">{constraintLabel(constraint.kind)}</Badge> {constraint.value}</>}
          onChange={(event) => toggle(constraint, event.target.checked)}
        />
      ))}
      {removed.length > 0 ? (
        <Callout role="alert" title="Removing a constraint" tone="warning">
          <p>Bidders on the piece won’t be told to meet it. The removal is recorded in the piece’s audit trail.</p>
          <Checkbox checked={isAcknowledged} label="I understand; remove it from the piece" onChange={(event) => onAcknowledge(event.target.checked)} />
        </Callout>
      ) : null}
    </fieldset>
  );
}
