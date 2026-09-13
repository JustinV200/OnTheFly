/* Names the presenter's staging points and ties each to the demo script: how many of the eight steps a stage leaves done,
   so a button can say which step it jumps to and the guide can mark the stage the live progress matches.
   The stage names and order must match STAGE_ORDER in backend app/services/demo/task_chain/stages.py, and the step
   counts must match what that stage replays against chainSteps.ts. */
import type { ChainStep } from '../../progress/chainSteps';

export interface StageEntry {
  name: string;
  label: string;
  // Leading steps of the script that are done right after staging this point.
  stepsDone: number;
}

export const STAGES: StageEntry[] = [
  { name: 'start', label: 'Start over: ledger, rates, nothing posted', stepsDone: 0 },
  { name: 'rebid_published', label: 'GovCon’s REBID is public', stepsDone: 1 },
  { name: 'prime_offer', label: 'Prime A has bid', stepsDone: 2 },
  { name: 'prime_owns', label: 'Prime A owns the task', stepsDone: 3 },
  // Staging a published piece replays both the split (step 4) and publishing it (step 5).
  { name: 'piece_published', label: 'Piece is public', stepsDone: 5 },
  { name: 'sub_offer', label: 'Sub B has bid', stepsDone: 6 },
  // Accepting Sub B's offer is step 7, and Sub B owning the piece (step 8) follows from it.
  { name: 'sub_owns', label: 'Sub B owns the piece', stepsDone: 8 },
];

/** Return the catalog entry for a stage name the server listed, or null for a name this frontend doesn't know. */
export function findStage(name: string): StageEntry | null {
  return STAGES.find((stage) => stage.name === name) ?? null;
}

/** The button text: what is true at that point, e.g. "GovCon’s REBID is public". The step numbers stay off the buttons:
    two stages replay two steps each, so numbering them read as a gap in the sequence. */
export function describeStage(name: string): string {
  return findStage(name)?.label ?? name;
}

/** The steps a stage leaves done, in words for a hint, e.g. "after step 3" or "every step done". */
export function describeStageProgress(name: string, stepCount: number): string | null {
  const stage = findStage(name);
  if (stage === null) {
    return null;
  }
  if (stage.stepsDone === 0) {
    return 'before step 1';
  }
  return stage.stepsDone >= stepCount ? 'every step done' : `after step ${stage.stepsDone}`;
}

/** The furthest stage the live progress has reached, counting only leading done steps. Null when nothing is known. */
export function currentStageName(steps: ChainStep[]): string | null {
  const firstUndone = steps.findIndex((step) => !step.isDone);
  const leadingDone = firstUndone === -1 ? steps.length : firstUndone;
  // A half-finished pair (split but not yet published) still counts as the stage before it: that is the last point
  // staging could reproduce exactly.
  const reached = STAGES.filter((stage) => stage.stepsDone <= leadingDone);
  return reached.length > 0 ? reached[reached.length - 1].name : null;
}
