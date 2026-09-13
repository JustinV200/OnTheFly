/* A text input with a "$" drawn at its start. It forwards every input prop (including the id and aria attributes Field
   injects) to the real <input>, so it can be Field's child and stay properly labelled. */
import { forwardRef, InputHTMLAttributes } from 'react';

import { Input, joinClassNames } from '../../../../../shared/ui';
import './BidForm.css';

/** Render the prefixed amount input. */
export const DollarInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function DollarInput({ className, ...rest }, ref) {
  return (
    <span className="dollar-input">
      <span aria-hidden="true" className="dollar-input__prefix">$</span>
      <Input {...rest} className={joinClassNames('dollar-input__control', className)} ref={ref} />
    </span>
  );
});
