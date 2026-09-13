/* A row of mutually exclusive choices that shows every option at once (Included / Not included / Not stated,
   Light / Dark / System, Sealed / Open). Radio-group semantics with arrow-key movement, so it works like native radios.
   Use it instead of a <select> when there are two to four short options and seeing them all helps the decision. */
import { KeyboardEvent, ReactNode, useRef } from 'react';

import { joinClassNames } from '../../joinClassNames';
import './SegmentedControl.css';

export interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
  icon?: ReactNode;
  // Show only the icon; the label is still announced and shown as a tooltip.
  isLabelHidden?: boolean;
}

interface SegmentedControlProps<Value extends string> {
  // Names the group for assistive technology ("Theme", "Equipment included").
  label: string;
  options: SegmentedOption<Value>[];
  // null means nothing is chosen yet, which is different from any option (e.g. an unanswered question).
  value: Value | null;
  onChange: (value: Value) => void;
  size?: 'sm' | 'md';
  isDisabled?: boolean;
  className?: string;
}

/** Render the segmented radio group. Exactly one segment is tabbable: the chosen one, or the first when none is. */
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
  isDisabled = false,
  className,
}: SegmentedControlProps<Value>): JSX.Element {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabbableIndex = selectedIndex === -1 ? 0 : selectedIndex;

  // Arrow keys move and select together, as native radio buttons do.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0 || isDisabled) {
      return;
    }
    event.preventDefault();
    const next = (tabbableIndex + step + options.length) % options.length;
    onChange(options[next].value);
    buttonsRef.current[next]?.focus();
  };

  return (
    <div
      aria-disabled={isDisabled || undefined}
      aria-label={label}
      className={joinClassNames('ui-segmented', `ui-segmented--${size}`, className)}
      onKeyDown={onKeyDown}
      role="radiogroup"
    >
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        return (
          <button
            aria-checked={isSelected}
            aria-label={option.isLabelHidden ? option.label : undefined}
            className="ui-segmented__option"
            disabled={isDisabled}
            key={option.value}
            onClick={() => onChange(option.value)}
            ref={(element) => {
              buttonsRef.current[index] = element;
            }}
            role="radio"
            tabIndex={index === tabbableIndex ? 0 : -1}
            title={option.isLabelHidden ? option.label : undefined}
            type="button"
          >
            {option.icon ? <span className="ui-segmented__icon">{option.icon}</span> : null}
            {option.isLabelHidden ? null : <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
