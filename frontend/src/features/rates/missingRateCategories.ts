/* Which of a task's labor categories have no usable rate, named exactly, so the owner knows what to add. Mirrors the
   server's lookup (services/rates/lookup.py find_rate): same kind, same currency, scoped to this task or account-wide,
   and already in effect. It only names gaps; keep cost itself is computed on the server. */
import type { CostBasisRate, RateKind } from './types';

interface RateNeeds {
  taskId: string;
  currency: string;
  kind: RateKind;
  laborCategories: string[];
}

/** Return the labor categories, in the order given, that no rate in the list covers. */
export function missingRateCategories(rates: CostBasisRate[], needs: RateNeeds): string[] {
  // ISO dates compare correctly as strings; "today" is the viewer's local date, as the add form's default date is.
  const today = localIsoDate(new Date());
  return needs.laborCategories.filter((category) => !rates.some((rate) => (
    rate.kind === needs.kind
    && rate.labor_category === category
    && rate.currency === needs.currency
    && (rate.task_id === null || rate.task_id === needs.taskId)
    && rate.effective_date <= today
  )));
}

function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
