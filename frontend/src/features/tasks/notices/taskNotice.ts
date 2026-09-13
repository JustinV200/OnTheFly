/* The success messages the task page can show after an action on it: a publish, an acceptance (ownership moved), or a
   split. Figures in a split notice were read from the API before and after the split; nothing here is computed. The
   page keys its state by task id, so a notice never survives navigating to another task. */

export type TaskNotice =
  | { kind: 'published'; listingId: string | null }
  | { kind: 'accepted'; bidderName: string }
  | {
    kind: 'split';
    childTaskId: string;
    pieceTitle: string | null;
    // "Remainder" for an owner after acceptance; "Listed price" for a poster that still owns its listing.
    figureLabel: string;
    beforeMinor: number | null;
    afterMinor: number | null;
    currency: string;
    billingPeriod: string;
  };
