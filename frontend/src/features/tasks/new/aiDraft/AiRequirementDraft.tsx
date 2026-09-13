/* The AI side of requirement entry: the owner describes the work in their own words, OpenAI drafts rows with tags and
   hours, and the rows are appended to the editor below as drafts to review. Manual entry stays right beside it. The
   model never sets a price, and a missing key or failed draft says so instead of quietly adding nothing. */
import { useState } from 'react';

import { ApiError } from '../../../../shared/api/client';
import { Button, Callout, Disclosure, Field, Icon, Stack, Textarea } from '../../../../shared/ui';
import type { RequirementDraft } from '../draft/draftTypes';
import { draftRowsFromResult } from './draftRowsFromResult';
import { RequirementDraftContext, RequirementDraftResult, requestRequirementDraft } from './requestRequirementDraft';
import './AiRequirementDraft.css';

interface AiRequirementDraftProps {
  context: RequirementDraftContext;
  onDrafted: (rows: RequirementDraft[]) => void;
  // Open by default where typing rows first is unlikely (a task with none yet); closed where rows already exist.
  isDefaultOpen?: boolean;
}

const MIN_DESCRIPTION_LENGTH = 10;

/** Render the describe-and-draft panel. */
export function AiRequirementDraft({ context, onDrafted, isDefaultOpen = false }: AiRequirementDraftProps): JSX.Element {
  const [description, setDescription] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [result, setResult] = useState<RequirementDraftResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draft = async (): Promise<void> => {
    if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      setError('Describe the work in a sentence or more first.');
      return;
    }
    setIsDrafting(true);
    setError(null);
    setResult(null);
    try {
      const answer = await requestRequirementDraft(description.trim(), context);
      setResult(answer);
      if (answer.status === 'drafted' && answer.requirements.length > 0) {
        onDrafted(draftRowsFromResult(answer));
      }
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.message);
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <Disclosure isDefaultOpen={isDefaultOpen} summary={<span className="ai-draft__summary"><Icon name="send" /> Draft requirements with AI</span>} variant="card">
      <Stack gap={3}>
        <Field
          hint="Your own words about the work: what, how often, how many people. This text is sent to OpenAI to draft rows; nothing is saved until you save this form, and the model never sets a price."
          label="Describe the work"
        >
          <Textarea
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Keep our AWS GovCloud environment patched, run monthly vulnerability scans and write up findings for our ISSO. About one engineer half time."
            rows={4}
            value={description}
          />
        </Field>
        <div>
          <Button isBusy={isDrafting} onClick={() => void draft()} size="sm" variant="secondary">
            {isDrafting ? 'Drafting…' : 'Draft requirements'}
          </Button>
        </div>
        {error ? <Callout role="alert" title="Couldn’t draft" tone="danger"><p>{error}</p></Callout> : null}
        {result ? <DraftOutcome result={result} /> : null}
      </Stack>
    </Disclosure>
  );
}

function DraftOutcome({ result }: { result: RequirementDraftResult }): JSX.Element {
  if (result.status === 'not_run') {
    return <Callout role="status" title="AI drafting isn’t set up" tone="neutral"><p>{result.detail}</p></Callout>;
  }
  if (result.status === 'failed') {
    return <Callout role="alert" title="AI draft failed" tone="danger"><p>{result.detail} You can still add requirements by hand.</p></Callout>;
  }
  const count = result.requirements.length;
  return (
    <Callout role="status" title={count === 0 ? 'No new requirements drafted' : `Added ${count} AI-drafted row${count === 1 ? '' : 's'} below`} tone="info">
      <Stack gap={2}>
        <p>
          {count === 0
            ? result.detail
            : 'AI draft — review every row. Tags and hours stay unconfirmed until you tick them, and you can edit or remove any row.'}
          {result.dropped_count > 0 ? ` ${result.dropped_count} drafted row${result.dropped_count === 1 ? ' was' : 's were'} left out as blank or repeated.` : ''}
        </p>
        {result.open_questions.length > 0 ? (
          <div>
            <p className="ui-text-sm"><strong>Questions only you can answer:</strong></p>
            <ul className="ai-draft__questions">
              {result.open_questions.map((question) => <li key={question}>{question}</li>)}
            </ul>
          </div>
        ) : null}
        <p className="ui-text-xs ui-text-muted">Drafted by {result.model ?? 'an unnamed model'} · prompt {result.prompt_version ?? 'unrecorded'}</p>
      </Stack>
    </Callout>
  );
}
