/* The split drawer's own checks before it sends anything, as one sentence for the owner. The server checks every rule
   again (ownership, one active piece per requirement, the cut against the starting price); this only catches a form
   that can't be sent yet. */

export interface SplitDraftCheck {
  title: string;
  pickedKeyCount: number;
  addedRowCount: number;
  cutMinor: number | null;
  needsRemovalAcknowledgement: boolean;
}

/** Return the first problem with the split draft, or null when it can be sent. */
export function splitProblem(draft: SplitDraftCheck): string | null {
  if (!draft.title.trim()) {
    return 'Give the piece a title.';
  }
  if (draft.pickedKeyCount === 0 && draft.addedRowCount === 0) {
    return 'Pick a requirement from this task, or add one for the piece.';
  }
  if (draft.cutMinor === null || draft.cutMinor === 0) {
    return 'Enter a cut above $0, for example 224,640.';
  }
  if (draft.needsRemovalAcknowledgement) {
    return 'Confirm that bidders on the piece won’t be told to meet the constraints you removed.';
  }
  return null;
}
