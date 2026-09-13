/* The rehearsal shortcut, set apart in the demo-data tone so it can't be mistaken for a real default:
   "Fill with demo template" answers only the questions still unanswered (template/demoTemplate.ts). */
import { Badge, Button } from '../../../shared/ui';
import './DemoTemplateBar.css';

interface DemoTemplateBarProps {
  onFill: () => void;
}

/** Render the demo badge, one sentence on what the button does, and the button. */
export function DemoTemplateBar({ onFill }: DemoTemplateBarProps): JSX.Element {
  return (
    <div className="publish-demo-bar">
      <Badge tone="simulated">Demo</Badge>
      <p className="publish-demo-bar__text">Rehearsing? Fill the unanswered questions with example answers. Review them before previewing.</p>
      <Button onClick={onFill} size="sm">Fill with demo template</Button>
    </div>
  );
}
