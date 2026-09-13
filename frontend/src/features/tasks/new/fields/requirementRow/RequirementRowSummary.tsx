/* One requirement row folded to a line: the work, its priority, labor category and hours, and one status badge (what's
   missing, confirmed, or not confirmed yet). The AI draft badge stays on a row the model wrote, even once confirmed.
   Edit opens the full fields; nothing on this line changes the row. */
import { perPeriodWords, requirementPriorityLabel } from '../../../../../shared/market';
import { Badge, Button, Cluster, Icon } from '../../../../../shared/ui';
import type { RequirementDraft } from '../../draft/draftTypes';
import { isRowConfirmed, rowGaps } from './rowGaps';

interface RequirementRowSummaryProps {
  row: RequirementDraft;
  index: number;
  billingPeriod: string;
  canRemove: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

/** Render the folded row. */
export function RequirementRowSummary({ row, index, billingPeriod, canRemove, onEdit, onRemove }: RequirementRowSummaryProps): JSX.Element {
  const gaps = rowGaps(row);
  const facts = [
    requirementPriorityLabel(row.priority),
    row.laborCategory.trim() || null,
    row.hours.trim() ? `${row.hours.trim()} h ${perPeriodWords(billingPeriod)}` : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <div className="task-fields__summary">
      <div className="task-fields__summary-text">
        <span className="task-fields__summary-title">{index + 1}. {row.text.trim()}</span>
        <span className="ui-text-sm ui-text-muted">{facts.join(' · ')}</span>
        <Cluster gap={1}>
          {row.source === 'llm-draft' ? <Badge tone="brand">AI draft</Badge> : null}
          {gaps.length > 0 ? (
            <Badge title="Ways to save groups rows by labor category, PSC and NAICS, and costs them by hours" tone="warning">
              Missing {gaps.join(', ')}
            </Badge>
          ) : isRowConfirmed(row) ? (
            <Badge tone="success">Tags and hours confirmed</Badge>
          ) : (
            <Badge title="Only confirmed tags form Ways to save groups; unconfirmed hours stay an estimate" tone="neutral">
              Not confirmed yet
            </Badge>
          )}
        </Cluster>
      </div>
      <Cluster className="task-fields__summary-actions" gap={1} isNoWrap>
        <Button onClick={onEdit} size="sm">Edit</Button>
        {canRemove ? (
          <Button aria-label={`Remove requirement ${index + 1}`} iconStart={<Icon name="x" />} onClick={onRemove} size="sm" variant="ghost">
            Remove
          </Button>
        ) : null}
      </Cluster>
    </div>
  );
}
