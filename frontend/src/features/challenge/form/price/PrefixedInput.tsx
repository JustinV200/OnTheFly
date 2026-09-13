/* A text input with a fixed prefix drawn inside its border ("$ 2,400"), for typed amounts.
   Feature-local, with a twin in features/publish/form/fields, until the shared Input grows a prefix slot (roadmap 11, step 2
   "Input with prefix/suffix"); both then collapse into it.
   The prefix is decorative; the field's label or hint must still name the currency for screen readers. */
import { CSSProperties, forwardRef, InputHTMLAttributes } from 'react';

import { Input, joinClassNames } from '../../../../shared/ui';
import './PrefixedInput.css';

interface PrefixedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  prefix: string;
}

/** Render the prefix and a native input; every input prop (including the id and aria props Field adds) passes through. */
export const PrefixedInput = forwardRef<HTMLInputElement, PrefixedInputProps>(function PrefixedInput({ prefix, className, ...rest }, ref) {
  return (
    // The prefix length is data ("$" or "EUR "), so the input's left padding follows it through a custom property.
    <span className="bid-prefixed-input" style={{ '--prefix-chars': prefix.length } as CSSProperties}>
      <span aria-hidden="true" className="bid-prefixed-input__prefix">{prefix}</span>
      <Input {...rest} className={joinClassNames('bid-prefixed-input__control', className)} ref={ref} />
    </span>
  );
});
