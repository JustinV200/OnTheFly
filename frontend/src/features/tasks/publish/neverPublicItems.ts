/* What a task's public listing never carries, listed beside every preview (CLAUDE.md, "Never public" and "Nothing
   upstream appears in a piece's public projection"). A piece lists the upstream facts on top of the standing list. */
import type { TaskDetail } from '../types';

const ALWAYS = [
  'Who has bid (bidder identities)',
  'Offer prices, unless you choose open bidding',
  'Your cost basis rates, remainder and Ways to save cards',
  'Account and connection details',
];

const PIECE_ONLY = [
  'The task this piece was split from, and its client',
  'The price you were accepted at on that task',
  'Your other pieces and their cuts',
];

/** Return the never-public list for the task's origin. */
export function neverPublicItems(task: TaskDetail): string[] {
  if (task.origin === 'split') {
    return [...PIECE_ONLY, ...ALWAYS];
  }
  if (task.origin === 'rebid') {
    return ['Raw transaction history and your other expenses', 'Your current vendor’s name, unless you opt in', ...ALWAYS];
  }
  return ALWAYS;
}
