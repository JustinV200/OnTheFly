/* One switch to confirm the tags and hours on every typed row at once, after the owner has read them. It is an explicit
   owner action like the per-row switches, never a default: AI-drafted rows arrive unconfirmed and keep their badge, and
   the hint says how many of them this would confirm. Rows with blank hours keep those hours unanswered. */
import { Checkbox } from '../../../../../shared/ui';
import type { RequirementDraft } from '../../draft/draftTypes';
import { isRowConfirmed } from './rowGaps';

interface ConfirmAllRowsProps {
  rows: RequirementDraft[];
  onChange: (rows: RequirementDraft[]) => void;
}

/** Render the confirm-all switch for the typed rows. */
export function ConfirmAllRows({ rows, onChange }: ConfirmAllRowsProps): JSX.Element {
  const typed = rows.filter((row) => row.text.trim() !== '');
  const confirmedCount = typed.filter(isRowConfirmed).length;
  const draftedCount = typed.filter((row) => row.source === 'llm-draft').length;
  const isAllConfirmed = typed.length > 0 && confirmedCount === typed.length;

  const setAll = (isConfirmed: boolean): void => {
    onChange(rows.map((row) => (row.text.trim() === ''
      ? row
      // Hours can only be confirmed when there are some; blank stays unanswered, never a confirmed zero.
      : { ...row, isTagsConfirmed: isConfirmed, isHoursConfirmed: isConfirmed && row.hours.trim() !== '' })));
  };

  return (
    <Checkbox
      checked={isAllConfirmed}
      hint={`${confirmedCount} of ${typed.length} rows confirmed${draftedCount > 0 ? ` · ${draftedCount} drafted by AI: read them before confirming` : ''}`}
      label="I’ve reviewed these: confirm tags and hours on every row"
      onChange={(event) => setAll(event.target.checked)}
    />
  );
}
