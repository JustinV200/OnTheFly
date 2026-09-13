/* A text input with a fixed prefix drawn inside its border ("$ 2,400"), for typed amounts.
   Feature-local until the shared Input grows a prefix slot (roadmap 11, step 2 "Input with prefix/suffix").
   The prefix is decorative; the field's label or hint must still name the currency for screen readers. */
import { forwardRef, InputHTMLAttributes } from 'react';

import { Input, joinClassNames } from '../../../../shared/ui';
import './PrefixedInput.css';

interface PrefixedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  prefix: string;
}

/** Render the prefix and a native input; every input prop (including the id and aria props Field adds) passes through. */
export const PrefixedInput = forwardRef<HTMLInputElement, PrefixedInputProps>(function PrefixedInput({ prefix, className, ...rest }, ref) {
  return (
    <span className="publish-prefixed-input">
      <span aria-hidden="true" className="publish-prefixed-input__prefix">{prefix}</span>
      <Input {...rest} className={joinClassNames('publish-prefixed-input__control', className)} ref={ref} />
    </span>
  );
});
