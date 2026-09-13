/* A labelled checkbox with an optional hint. */
import { forwardRef } from 'react';

import { ChoiceControl, ChoiceProps } from './ChoiceControl';

/** Render a native checkbox inside its label; every input prop except type passes through. */
export const Checkbox = forwardRef<HTMLInputElement, ChoiceProps>(function Checkbox(props, ref) {
  return <ChoiceControl {...props} ref={ref} type="checkbox" />;
});
