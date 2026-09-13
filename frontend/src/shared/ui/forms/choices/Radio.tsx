/* A labelled radio with an optional hint. Group radios inside a <fieldset> with a <legend> naming the choice. */
import { forwardRef } from 'react';

import { ChoiceControl, ChoiceProps } from './ChoiceControl';

/** Render a native radio inside its label; give every radio in a group the same name. */
export const Radio = forwardRef<HTMLInputElement, ChoiceProps>(function Radio(props, ref) {
  return <ChoiceControl {...props} ref={ref} type="radio" />;
});
