/* Implements the early publish flow around draft creation and preview.
   It keeps steps explicit so the owner sees what will become public. */
import { DisclosureChoices } from './DisclosureChoices';
import { PublishPreview } from './PublishPreview';
import { ScopeForm } from './ScopeForm';
import { usePublish } from './usePublish';

/** Render the draft, preview, and publish flow for one expense listing. */
export function PublishFlow(): JSX.Element {
  const { expenses, preview, errorMessage, createDraft, publish } = usePublish();

  return (
    <section>
      <ScopeForm expenses={expenses} onSubmit={createDraft} />
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <DisclosureChoices />
      <PublishPreview preview={preview} />
      <button disabled={!preview} onClick={() => void publish()} type="button">
        Publish listing
      </button>
    </section>
  );
}
