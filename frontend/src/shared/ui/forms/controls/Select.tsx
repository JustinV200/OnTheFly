/* A styled native select with a drawn chevron. Native keeps phone pickers and keyboard behaviour for free. */
import { forwardRef, SelectHTMLAttributes } from 'react';

import { joinClassNames } from '../../joinClassNames';
import './controls.css';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Render a select; pass <option> children as usual. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, ...rest }, ref) {
  return <select {...rest} className={joinClassNames('ui-control', 'ui-control--select', className)} ref={ref} />;
});
