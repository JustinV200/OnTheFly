/* The page's single connection to the simulation worker, created on first use and kept for the whole visit.
   One worker means the 22 MB brain is downloaded and decoded once, however many runs play or viewers remount. */
import type { BrainStimulus } from '../../../shared/flybrain/live/brainStimulusTypes';
import type { BrainLayout } from '../connectome/brainData';
import type { PageToWorkerMessage, WorkerToPageMessage } from '../simulation/worker/workerProtocol';

type Listener = (message: WorkerToPageMessage) => void;

export class BrainWorkerClient {
  private readonly worker: Worker;
  private readonly listeners = new Set<Listener>();
  // Kept so a viewer that mounts after the brain loaded still gets the layout without a new download.
  private layout: BrainLayout | null = null;
  private dataFailure: string | null = null;

  public constructor() {
    this.worker = new Worker(new URL('../simulation/worker/simulator.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<WorkerToPageMessage>) => {
      const message = event.data;
      if (message.type === 'ready') {
        this.layout = message.layout;
        this.dataFailure = null;
      } else if (message.type === 'failed' && message.runId === null) {
        this.dataFailure = message.message;
      }
      this.listeners.forEach((listener) => listener(message));
    };
    this.worker.onerror = (event: ErrorEvent) => {
      // A worker script that fails to load or throws outside a handler; every open viewer shows it.
      const failure: WorkerToPageMessage = { type: 'failed', runId: null, message: `The brain simulator stopped: ${event.message}` };
      this.dataFailure = failure.message;
      this.listeners.forEach((listener) => listener(failure));
    };
  }

  /** The decoded layout once the brain has loaded, else null. */
  public get loadedLayout(): BrainLayout | null {
    return this.layout;
  }

  /** The reason the brain data could not load, if the last attempt failed. */
  public get loadFailure(): string | null {
    return this.dataFailure;
  }

  /** Listen to every worker message; returns the unsubscribe function. */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Start (or restart) a run; any run already in the worker is replaced. */
  public start(runId: string, stimulus: BrainStimulus, seed: number): void {
    this.send({ type: 'start', runId, stimulus, seed });
  }

  /** Tell the worker how far playback has reached, so it simulates just ahead of the screen. */
  public reportPlayback(runId: string, step: number): void {
    this.send({ type: 'playback', runId, step });
  }

  /** Stop computing a run nobody is watching any more. */
  public cancel(runId: string): void {
    this.send({ type: 'cancel', runId });
  }

  private send(message: PageToWorkerMessage): void {
    this.worker.postMessage(message);
  }
}

let sharedClient: BrainWorkerClient | null = null;

/** Return the visit-wide worker client, creating the worker on the first call. */
export function brainWorkerClient(): BrainWorkerClient {
  if (sharedClient === null) {
    sharedClient = new BrainWorkerClient();
  }
  return sharedClient;
}
