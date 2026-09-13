/* Wraps one form control with its visible label, an optional hint, and an optional error.
   It wires the id, aria-describedby, and aria-invalid onto the child, so no control ships without a label. */
import { cloneElement, ReactElement, ReactNode, useId } from 'react';

import { joinClassNames } from '../joinClassNames';
import './Field.css';

// The props Field sets on its child. Input, Select, Textarea, and native elements all accept them.
interface FieldControlProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

interface FieldProps {
  label: ReactNode;
  // Guidance shown under the control, e.g. "Blank means not stated".
  hint?: ReactNode;
  // A validation message; also marks the control aria-invalid. Leave undefined when valid.
  error?: ReactNode;
  className?: string;
  // Exactly one control element.
  children: ReactElement<FieldControlProps>;
}

/** Render a labelled field around a single control. */
export function Field({ label, hint, error, className, children }: FieldProps): JSX.Element {
  const generatedId = useId();
  const controlId = children.props.id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [children.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={joinClassNames('ui-field', error ? 'ui-field--invalid' : undefined, className)}>
      <label className="ui-field__label" htmlFor={controlId}>{label}</label>
      {cloneElement(children, { id: controlId, 'aria-describedby': describedBy, 'aria-invalid': error ? true : children.props['aria-invalid'] })}
      {hint ? <div className="ui-field__hint" id={hintId}>{hint}</div> : null}
      {error ? <div className="ui-field__error" id={errorId}>{error}</div> : null}
    </div>
  );
}
