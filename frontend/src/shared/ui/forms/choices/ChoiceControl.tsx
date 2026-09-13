/* The shared layout behind Checkbox and Radio: a native input inside its label, with an optional hint line.
   Internal to forms/choices; import Checkbox or Radio instead. */
import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';

import { joinClassNames } from '../../joinClassNames';
import './choices.css';

export interface ChoiceProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  // Second line explaining the consequence of the choice.
  hint?: ReactNode;
}

interface ChoiceControlProps extends ChoiceProps {
  type: 'checkbox' | 'radio';
}

/** Render a labelled checkbox or radio. The input stays native, so form-level change handlers still hear it. */
export const ChoiceControl = forwardRef<HTMLInputElement, ChoiceControlProps>(function ChoiceControl({ label, hint, className, type, ...rest }, ref) {
  const hintId = useId();
  const describedBy = [rest['aria-describedby'], hint ? hintId : undefined].filter(Boolean).join(' ') || undefined;
  return (
    <label className={joinClassNames('ui-choice', rest.disabled && 'ui-choice--disabled', className)}>
      <input {...rest} aria-describedby={describedBy} className="ui-choice__input" ref={ref} type={type} />
      <span className="ui-choice__text">
        <span className="ui-choice__label">{label}</span>
        {hint ? <span className="ui-choice__hint" id={hintId}>{hint}</span> : null}
      </span>
    </label>
  );
});
