/* Requirement rows as a compact list: a row with its work typed in folds to one line with Edit, and a blank or edited row
   stays open with every field. Filling from a template, an AI draft or a saved scope therefore shows a short, readable
   list instead of dozens of inputs. With two or more typed rows, one switch confirms them all after review. Used by the
   task scope form and the split drawer. Only confirmed tags form Ways to save segments (plan2, "Model and code boundaries"). */
import { useState } from 'react';

import { Button, Icon, Stack } from '../../../../shared/ui';
import { emptyRequirement, RequirementDraft } from '../draft/draftTypes';
import { ConfirmAllRows } from './requirementRow/ConfirmAllRows';
import { RequirementRowFields } from './requirementRow/RequirementRowFields';
import { RequirementRowSummary } from './requirementRow/RequirementRowSummary';
import './TaskFields.css';

interface RequirementRowsEditorProps {
  rows: RequirementDraft[];
  billingPeriod: string;
  onChange: (rows: RequirementDraft[]) => void;
  // The fewest rows the owner can remove down to: 1 on a task form, which needs a requirement; 0 in the split drawer,
  // where added rows are optional next to the requirements picked from the task.
  minRows?: number;
  addLabel?: string;
}

/** Render the rows, folded or open, with the confirm-all switch and the add control. */
export function RequirementRowsEditor({ rows, billingPeriod, onChange, minRows = 1, addLabel = 'Add requirement' }: RequirementRowsEditorProps): JSX.Element {
  // Rows the owner opened or typed into. A blank row is always open, so the first keystroke must add it here, or the
  // row would fold away mid-word once its text stops being blank.
  const [openRowIds, setOpenRowIds] = useState<ReadonlySet<string>>(() => new Set());
  const typedCount = rows.filter((row) => row.text.trim() !== '').length;
  const canRemove = rows.length > minRows;

  const setOpen = (rowId: string, isOpen: boolean): void => {
    setOpenRowIds((current) => {
      if (current.has(rowId) === isOpen) {
        return current;
      }
      const next = new Set(current);
      if (isOpen) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  };
  const update = (rowId: string, patch: Partial<RequirementDraft>): void => {
    setOpen(rowId, true);
    onChange(rows.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
  };
  const remove = (rowId: string): void => onChange(rows.filter((item) => item.rowId !== rowId));

  return (
    <Stack gap={3}>
      {typedCount >= 2 ? <ConfirmAllRows onChange={onChange} rows={rows} /> : null}
      {rows.map((row, index) => (
        openRowIds.has(row.rowId) || row.text.trim() === '' ? (
          <RequirementRowFields
            billingPeriod={billingPeriod}
            canRemove={canRemove}
            index={index}
            key={row.rowId}
            onChange={(patch) => update(row.rowId, patch)}
            onDone={() => setOpen(row.rowId, false)}
            onRemove={() => remove(row.rowId)}
            row={row}
          />
        ) : (
          <RequirementRowSummary
            billingPeriod={billingPeriod}
            canRemove={canRemove}
            index={index}
            key={row.rowId}
            onEdit={() => setOpen(row.rowId, true)}
            onRemove={() => remove(row.rowId)}
            row={row}
          />
        )
      ))}
      <div>
        <Button iconStart={<Icon name="plus" />} onClick={() => onChange([...rows, emptyRequirement()])} size="sm">{addLabel}</Button>
      </div>
    </Stack>
  );
}
