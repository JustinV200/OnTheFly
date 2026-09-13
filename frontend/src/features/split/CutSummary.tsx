/* The live ledger line under the cut: starting price, what's already committed, this cut, and the remainder it leaves.
   The subtraction is display only, on the server's own figures; the split endpoint enforces the real rule
   (total cuts ≤ starting price, remainder ≥ 0) and says so if this line was wrong. */
import { MoneyDisplay } from '../../shared/components/MoneyDisplay';
import { Badge, Stat } from '../../shared/ui';
import type { TaskDetail } from '../tasks/types';

interface CutSummaryProps {
  task: TaskDetail;
  cutMinor: number | null;
}

/** Render the starting price, committed amount and remainder after this cut. */
export function CutSummary({ task, cutMinor }: CutSummaryProps): JSX.Element {
  const ledger = task.ledger;
  if (!ledger || ledger.starting_price_minor === null || ledger.remainder_minor === null) {
    return <p className="ui-text-muted ui-text-sm">This task has no starting price yet, so a cut can’t be checked here.</p>;
  }
  const after = cutMinor === null ? null : ledger.remainder_minor - cutMinor;
  const money = (minor: number): JSX.Element => <MoneyDisplay amountMinor={minor} currency={task.currency} />;

  return (
    <div className="split-drawer__ledger">
      <Stat
        caption={ledger.starting_price_basis === 'accepted_offer' ? 'Your accepted offer' : 'Your listed price before your splits'}
        label="Starting price"
        size="md"
        value={money(ledger.starting_price_minor)}
      />
      <Stat caption={`${ledger.pieces.length} piece${ledger.pieces.length === 1 ? '' : 's'} so far`} label="Already committed" size="md" value={money(ledger.committed_minor)} />
      <Stat
        caption={after !== null && after < 0 ? <Badge tone="danger">Below zero: the split will be refused</Badge> : 'Checked again when you split'}
        label="Remainder after this cut"
        size="md"
        tone={after !== null && after < 0 ? 'danger' : 'default'}
        value={after === null ? <span className="ui-text-muted">Enter a cut</span> : money(after)}
      />
    </div>
  );
}
