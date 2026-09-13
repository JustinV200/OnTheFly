/* A scrolling row of pill filters, like a market app's category bar: "All · Cleaning · Landscaping".
   Single choice, pressed-button semantics (a filter that changes the list below, not a tab panel). */
import type { ReactNode } from 'react';

import { joinClassNames } from '../joinClassNames';
import './FilterChips.css';

export interface FilterChip<Value extends string> {
  value: Value;
  label: string;
  // A count beside the label, e.g. how many listings the filter matches.
  count?: number;
  icon?: ReactNode;
}

interface FilterChipsProps<Value extends string> {
  label: string;
  chips: FilterChip<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  className?: string;
}

/** Render the chip row; the chosen chip is filled and marked pressed. */
export function FilterChips<Value extends string>({ label, chips, value, onChange, className }: FilterChipsProps<Value>): JSX.Element {
  return (
    <div aria-label={label} className={joinClassNames('ui-filter-chips', className)} role="group">
      {chips.map((chip) => (
        <button
          aria-pressed={chip.value === value}
          className="ui-filter-chip"
          key={chip.value}
          onClick={() => onChange(chip.value)}
          type="button"
        >
          {chip.icon ? <span className="ui-filter-chip__icon">{chip.icon}</span> : null}
          {chip.label}
          {chip.count !== undefined ? <span className="ui-filter-chip__count">{chip.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
