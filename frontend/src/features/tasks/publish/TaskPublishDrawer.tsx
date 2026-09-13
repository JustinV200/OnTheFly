/* Confirm → exact preview → publish for a task's listing, in one drawer (roadmap 12, steps 3 and 6). A new task or a
   piece first confirms its disclosure choices (bidding mode, and whether to show its price, off by default); a REBID
   already confirmed its scope on the REBID form. The preview is the literal payload strangers get, shown as the market
   card and as JSON, and publishing sends that payload's hash, so nothing different can go public. */
import { useEffect, useState } from 'react';

import { ApiError, get, post } from '../../../shared/api/client';
import { MarketCard } from '../../../shared/market';
import { Button, Callout, Checkbox, Disclosure, Drawer, SegmentedControl, Stack } from '../../../shared/ui';
import { PayloadJson } from '../../publish/preview/PayloadJson';
import type { ListingPreviewResponse } from '../../publish/types';
import type { TaskDetail } from '../types';
import { neverPublicItems } from './neverPublicItems';
import './TaskPublishDrawer.css';

type Mode = 'sealed' | 'open';

interface TaskPublishDrawerProps {
  task: TaskDetail;
  isOpen: boolean;
  onClose: () => void;
  onPublished: () => void;
}

/** Render the publish drawer for a task the viewer posted. */
export function TaskPublishDrawer({ task, isOpen, onClose, onPublished }: TaskPublishDrawerProps): JSX.Element | null {
  const visibility = task.listing?.visibility ?? 'private';
  const needsConfirm = task.origin !== 'rebid' && visibility !== 'scope_confirmed';
  const [mode, setMode] = useState<Mode>(task.listing?.bidding_mode === 'open' ? 'open' : 'sealed');
  const [isPriceShown, setIsPriceShown] = useState(task.listing?.price_disclosed ?? false);
  const [preview, setPreview] = useState<ListingPreviewResponse | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // A REBID or an already confirmed listing opens straight on its preview. Keyed on opening and closing only: the task
  // prop refreshes on every poll, and re-fetching the preview mid-review would swap the hash the owner is reading.
  useEffect(() => {
    if (isOpen && !needsConfirm && preview === null) {
      void run(() => get<ListingPreviewResponse>(`/api/tasks/${task.id}/preview`).then(setPreview));
    }
    if (!isOpen) {
      setPreview(null);
      setError(null);
    }
  }, [isOpen]);

  const run = async (action: () => Promise<void>): Promise<void> => {
    setIsWorking(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught);
    } finally {
      setIsWorking(false);
    }
  };

  const confirm = (): Promise<void> =>
    run(async () => {
      await post(`/api/tasks/${task.id}/confirm`, { bidding_mode: mode, show_price: isPriceShown });
      setPreview(await get<ListingPreviewResponse>(`/api/tasks/${task.id}/preview`));
    });

  const publish = (): Promise<void> =>
    run(async () => {
      if (!preview) {
        return;
      }
      await post(`/api/tasks/${task.id}/publish`, { previewed_payload_hash: preview.payload_hash });
      onPublished();
      onClose();
    });

  const footer = preview ? (
    <Button isBusy={isWorking} onClick={() => void publish()} size="lg" variant="primary">
      {isWorking ? 'Publishing…' : 'Publish exactly this'}
    </Button>
  ) : needsConfirm ? (
    <Button isBusy={isWorking} onClick={() => void confirm()} size="lg" variant="primary">
      {isWorking ? 'Confirming…' : 'Confirm and preview'}
    </Button>
  ) : undefined;

  return (
    <Drawer
      description={preview ? 'This is what strangers will see. Nothing is public until you publish.' : 'Your listing stays private until you publish the exact preview.'}
      footer={footer}
      isOpen={isOpen}
      onClose={onClose}
      title={preview ? 'Preview the public listing' : 'Confirm what goes public'}
      width="lg"
    >
      <Stack gap={5}>
        {error ? <Callout role="alert" title="That didn’t work" tone="danger"><p>{error.message}</p></Callout> : null}
        {!preview && needsConfirm ? (
          <Stack gap={4}>
            <fieldset className="task-publish__fieldset">
              <legend className="ui-eyebrow">Bidding mode</legend>
              <SegmentedControl
                label="Bidding mode"
                onChange={setMode}
                options={[{ value: 'sealed', label: 'Sealed (default)' }, { value: 'open', label: 'Open' }]}
                value={mode}
              />
              <p className="ui-text-sm ui-text-muted">
                {mode === 'open'
                  ? 'Offer prices and scope become public; who made them never does.'
                  : 'The public sees only how many offers there are.'}
              </p>
            </fieldset>
            <Checkbox
              checked={isPriceShown}
              hint={task.origin === 'split'
                ? 'Off by default: showing it discloses the cut you set aside for this piece.'
                : 'Off by default: the card reads "Price not disclosed" and your budget stays private.'}
              label={task.origin === 'split' ? 'Show the cut as the listing’s price' : 'Show your budget as the listing’s price'}
              onChange={(event) => setIsPriceShown(event.target.checked)}
            />
          </Stack>
        ) : null}
        {preview ? (
          <Stack gap={4}>
            <MarketCard headingLevel={3} listing={preview.projection} offerCount={null} />
            <Callout role="note" title="Never public" tone="private">
              <ul>{neverPublicItems(task).map((item) => <li key={item}>{item}</li>)}</ul>
            </Callout>
            <Disclosure summary="The exact JSON payload" variant="card">
              <PayloadJson listing={preview.projection} mode="preview" payloadHash={preview.payload_hash} />
            </Disclosure>
          </Stack>
        ) : null}
      </Stack>
    </Drawer>
  );
}
