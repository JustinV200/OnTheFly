/* Web Worker entry: loads the brain once, then runs one stimulus at a time for playback, posting spikes as they are
   computed, and evaluates opinion stimuli one after another between playback batches, posting only their totals.
   Everything heavy (22 MB download, decompression, decoding, 15 million connections) stays off the page's main thread. */
import { decodeBrainFile, type DecodedBrain } from '../../connectome/decodeBrainFile';
import { fetchBrainFile } from '../../connectome/fetchBrainFile';
import { TrialCounter } from '../evaluation/trialActivity';
import { SimulationRun } from '../simulationRun';
import type { PageToWorkerMessage, WorkerToPageMessage } from './workerProtocol';

// Served from frontend/public; built by frontend/scripts/flybrain-data/build_brain_data.py.
const BRAIN_FILE_URL = `${import.meta.env.BASE_URL}flybrain/fly-brain-783.bin.gz`;
// 10 ms of brain time per batch: small enough to stay responsive to cancel, large enough to keep messages few.
const BATCH_STEPS = 100;
// Simulate at most 300 ms of brain time beyond what is on screen, so a paused or slowed view doesn't burn CPU.
const LOOKAHEAD_STEPS = 3000;

interface ActiveRun {
  runId: string;
  run: SimulationRun;
  playbackStep: number;
}

type EvaluationRequest = Extract<PageToWorkerMessage, { type: 'evaluate' }>;

let brainPromise: Promise<DecodedBrain> | null = null;
let active: ActiveRun | null = null;
let wakePump: (() => void) | null = null;
// Evaluations wait their turn here; one runs at a time so a burst of offers never multiplies the memory in use.
const evaluationQueue: EvaluationRequest[] = [];
let isEvaluating = false;

const post = (message: WorkerToPageMessage, transfer: Transferable[] = []): void => {
  (self as unknown as Worker).postMessage(message, transfer);
};

self.onmessage = (event: MessageEvent<PageToWorkerMessage>): void => {
  const message = event.data;
  switch (message.type) {
    case 'start':
      void startRun(message.runId, message);
      break;
    case 'playback':
      if (active?.runId === message.runId) {
        active.playbackStep = message.step;
        wake();
      }
      break;
    case 'cancel':
      if (active?.runId === message.runId) {
        active = null;
        wake();
      }
      break;
    case 'evaluate':
      evaluationQueue.push(message);
      void drainEvaluations();
      break;
  }
};

async function startRun(runId: string, message: Extract<PageToWorkerMessage, { type: 'start' }>): Promise<void> {
  let brain: DecodedBrain;
  try {
    brain = await loadBrain();
  } catch (error) {
    // Forget the failed attempt so the next run retries the download instead of repeating the same error forever.
    brainPromise = null;
    post({ type: 'failed', runId: null, message: error instanceof Error ? error.message : String(error) });
    return;
  }

  let run: SimulationRun;
  try {
    run = new SimulationRun(brain.connectome, message.stimulus, message.seed);
  } catch (error) {
    post({ type: 'failed', runId, message: `This run couldn't start: ${error instanceof Error ? error.message : String(error)}` });
    return;
  }
  // A newer start replaces whatever was running; the old pump sees the change and stops.
  active = { runId, run, playbackStep: 0 };
  wake();
  const drivenNeurons = run.drivenNeurons.slice();
  post({ type: 'started', runId, totalSteps: run.totalSteps, drivenNeurons }, [drivenNeurons.buffer]);
  await pump(runId);
}

function loadBrain(): Promise<DecodedBrain> {
  if (brainPromise === null) {
    brainPromise = (async () => {
      const bytes = await fetchBrainFile(BRAIN_FILE_URL, (loadedBytes, totalBytes) => post({ type: 'loading', loadedBytes, totalBytes }));
      const decodeStarted = performance.now();
      const brain = decodeBrainFile(bytes);
      // The worker keeps its own copies; the page gets transferable copies of the small layout arrays.
      const positions = brain.layout.positions.slice();
      const displayGroups = brain.layout.displayGroups.slice();
      post(
        { type: 'ready', layout: { header: brain.layout.header, positions, displayGroups }, decodeMs: performance.now() - decodeStarted },
        [positions.buffer, displayGroups.buffer],
      );
      return brain;
    })();
  }
  return brainPromise;
}

async function pump(runId: string): Promise<void> {
  const started = performance.now();
  while (active?.runId === runId && !active.run.isFinished) {
    if (active.run.step > active.playbackStep + LOOKAHEAD_STEPS) {
      await new Promise<void>((resolve) => {
        wakePump = resolve;
      });
      continue;
    }
    const batch = active.run.advance(BATCH_STEPS);
    post({ type: 'spikes', runId, batch }, [batch.spikeNeurons.buffer, batch.spikeSteps.buffer]);
    await yieldToMessages();
  }
  if (active?.runId === runId) {
    post({ type: 'finished', runId, computeMs: performance.now() - started });
    active = null;
  }
}

async function drainEvaluations(): Promise<void> {
  if (isEvaluating) {
    return;
  }
  isEvaluating = true;
  try {
    for (let next = evaluationQueue.shift(); next !== undefined; next = evaluationQueue.shift()) {
      await evaluate(next);
    }
  } finally {
    isEvaluating = false;
  }
}

async function evaluate(request: EvaluationRequest): Promise<void> {
  let brain: DecodedBrain;
  try {
    brain = await loadBrain();
  } catch (error) {
    brainPromise = null;
    post({ type: 'failed', runId: null, message: error instanceof Error ? error.message : String(error) });
    return;
  }

  let run: SimulationRun;
  try {
    run = new SimulationRun(brain.connectome, request.stimulus, request.seed);
  } catch (error) {
    post({ type: 'failed', runId: request.evaluationId, message: `This evaluation couldn't start: ${error instanceof Error ? error.message : String(error)}` });
    return;
  }
  const counter = new TrialCounter(request.stimulus, run.totalSteps, brain.connectome.neuronCount);
  const started = performance.now();
  while (!run.isFinished) {
    counter.append(run.advance(BATCH_STEPS));
    // Between batches a playing run gets its turn, so an opinion never freezes the panel.
    await yieldToMessages();
  }
  post({ type: 'evaluated', evaluationId: request.evaluationId, evaluation: counter.result(performance.now() - started) });
}

function wake(): void {
  const resolve = wakePump;
  wakePump = null;
  resolve?.();
}

// A MessageChannel round trip lets queued messages (cancel, playback) run between batches without setTimeout's clamping.
function yieldToMessages(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });
}
