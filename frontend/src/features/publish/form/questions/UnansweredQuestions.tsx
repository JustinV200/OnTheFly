/* "N questions unanswered", shown before the owner moves to Preview (gaps before price). Not a blocker: an unanswered
   question publishes as "not specified", which is honest. Each gap is a button that moves focus to its field. */
import { Button, Callout, Cluster } from '../../../../shared/ui';
import type { UnansweredQuestion } from './listUnansweredQuestions';
import './UnansweredQuestions.css';

interface UnansweredQuestionsProps {
  questions: UnansweredQuestion[];
}

/** Render the gap list, or a short note that every scope question has an answer. */
export function UnansweredQuestions({ questions }: UnansweredQuestionsProps): JSX.Element {
  if (questions.length === 0) {
    return (
      <Callout role="note" title="Every scope question has an answer" tone="success">
        <p>Challengers will price against exactly what you entered.</p>
      </Callout>
    );
  }

  return (
    <Callout
      role="note"
      title={questions.length === 1 ? '1 question unanswered' : `${questions.length} questions unanswered`}
      tone="warning"
    >
      <p>Challengers will see these as not specified. Answer them, choose “Not stated”, or preview anyway.</p>
      <Cluster as="ul" className="publish-questions__list" gap={2}>
        {questions.map((question) => (
          <li key={question.fieldId}>
            <Button onClick={() => focusField(question.fieldId)} size="sm" variant="secondary">{question.label}</Button>
          </li>
        ))}
      </Cluster>
    </Callout>
  );
}

function focusField(fieldId: string): void {
  const element = document.getElementById(fieldId);
  if (!element) {
    // A listed field that isn't on screen is a bug in the id wiring; say so in development rather than doing nothing silently.
    console.error(`Unanswered question points at a missing field: #${fieldId}`);
    return;
  }
  // A segmented answer's wrapper isn't focusable itself; its tabbable radio is.
  const target = element.matches('input, select, textarea') ? element : element.querySelector<HTMLElement>('[tabindex="0"]');
  element.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  target?.focus({ preventScroll: true });
}
