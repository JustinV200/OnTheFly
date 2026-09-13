/* A styled native textarea that resizes vertically only, so it can't push a phone layout sideways. */
import { forwardRef, TextareaHTMLAttributes } from 'react';

import { joinClassNames } from '../../joinClassNames';
import './controls.css';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Render a multi-line text control. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, ...rest }, ref) {
  return <textarea {...rest} className={joinClassNames('ui-control', 'ui-control--textarea', className)} ref={ref} />;
});
