/* A styled native text input. It stays a real <input>, so form-level change handlers and autofill keep working. */
import { forwardRef, InputHTMLAttributes } from 'react';

import { joinClassNames } from '../../joinClassNames';
import './controls.css';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Render a text-like input (text, number, date, email…). Use Checkbox or Radio for those types. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...rest }, ref) {
  return <input {...rest} className={joinClassNames('ui-control', className)} ref={ref} />;
});
