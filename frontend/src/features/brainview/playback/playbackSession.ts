/* Plays one queued run: starts it in the worker, stores its spikes, and drives an animation-frame loop at the chosen speed.
   Kept outside React, so a 60 fps loop never re-renders components; the view reads a throttled status snapshot instead. */
import type { QueuedBrainRun } from '../../../shared/flybrain/live';
import type { BrainLayout } from '../connectome/brainData';
import type { WorkerToPageMessage } from '../simulation/worker/workerProtocol';
import type { BrainWorkerClient } from './brainWorkerClient';
import { PlaybackClock, type PlaybackSpeed } from './playbackClock';
import { RunTimeline } from './runTimeline';
import { derivePlaybackStatus, type PlaybackStatus, type SessionFacts } from './playbackStatus';
import { stimulusSeed } from './stimulusSeed';

/** Called once per animation frame with the neurons that fired since the previous frame. Return true to keep frames coming. */
export type FrameListener = (frame: { spikes: Int32Array; spikeCount: number; wallDeltaMs: number }) => boolean;

// Status text changes a few times a second at most; faster updates would only cost renders.
const STATUS_INTERVAL_MS = 200;
const PLAYBACK_REPORT_INTERVAL_MS = 100;

export class PlaybackSession {
  public readonly clock = new PlaybackClock();
  private readonly client: BrainWorkerClient;
  private readonly run: QueuedBrainRun;
  private readonly frameListeners = new Set<FrameListener>();
  private readonly statusListeners = new Set<() => void>();
  private readonly facts: SessionFacts;
  private timeline: RunTimeline | null = null;
  private status: PlaybackStatus;
  private spikeBuffer = new Int32Array(4096);
  private firedNeurons: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private lastFrameTime: number | null = null;
  private lastStatusTime = 0;
  private lastReportTime = 0;
  private unsubscribe: (() => void) | null = null;

  /** Prepare a session; nothing starts until start(). */
  public constructor(client: BrainWorkerClient, run: QueuedBrainRun) {
    this.client = client;
    this.run = run;
    this.facts = {
      run,
      layout: client.loadedLayout,
      loadFailure: client.loadFailure,
      loading: null,
      totalSteps: null,
      computedStep: 0,
      isComputed: false,
      firedNeuronCount: 0,
      drivenNeurons: null,
    };
    this.status = derivePlaybackStatus(this.facts, this.clock);
  }

  /** Subscribe to the worker and ask it to start this run. */
  public start(): void {
    this.unsubscribe = this.client.subscribe((message) => this.onWorkerMessage(message));
    this.client.start(this.run.id, this.run.stimulus, stimulusSeed(this.run.key));
    this.requestFrame();
  }

  /** Stop the loop and, if the run is still computing, tell the worker to stop too. */
  public dispose(): void {
    this.unsubscribe?.();
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (!this.facts.isComputed) {
      this.client.cancel(this.run.id);
    }
  }

  public get layout(): BrainLayout | null {
    return this.facts.layout;
  }

  public get drivenNeurons(): Uint32Array | null {
    return this.facts.drivenNeurons;
  }

  public get runTimeline(): RunTimeline | null {
    return this.timeline;
  }

  public getStatus(): PlaybackStatus {
    return this.status;
  }

  public subscribeStatus(listener: () => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public addFrameListener(listener: FrameListener): () => void {
    this.frameListeners.add(listener);
    this.requestFrame();
    return () => {
      this.frameListeners.delete(listener);
    };
  }

  /** Draw one more frame even when paused (the view was turned or its colours changed). */
  public requestRedraw(): void {
    this.requestFrame();
  }

  public setSpeed(speed: PlaybackSpeed): void {
    this.clock.speed = speed;
    this.publishStatus();
  }

  public togglePause(): void {
    this.clock.isPaused = !this.clock.isPaused;
    this.requestFrame();
    this.publishStatus();
  }

  /** Play the run again from the start, from the spikes already stored (the worker isn't asked to recompute). */
  public replay(): void {
    this.clock.rewind();
    this.clock.isPaused = false;
    this.facts.firedNeuronCount = 0;
    this.firedNeurons?.fill(0);
    this.requestFrame();
    this.publishStatus();
  }

  private onWorkerMessage(message: WorkerToPageMessage): void {
    if (message.type === 'loading') {
      this.facts.loading = { loadedBytes: message.loadedBytes, totalBytes: message.totalBytes };
    } else if (message.type === 'ready') {
      this.facts.layout = message.layout;
      this.facts.loadFailure = null;
    } else if (message.type === 'failed' && (message.runId === null || message.runId === this.run.id)) {
      this.facts.loadFailure = message.message;
    } else if (message.type === 'started' && message.runId === this.run.id && this.facts.layout !== null) {
      this.timeline = new RunTimeline(message.totalSteps, this.facts.layout.displayGroups);
      this.firedNeurons = new Uint8Array(this.facts.layout.header.neuron_count);
      this.facts.totalSteps = message.totalSteps;
      this.facts.drivenNeurons = message.drivenNeurons;
    } else if (message.type === 'spikes' && message.runId === this.run.id) {
      this.timeline?.append(message.batch);
      this.facts.computedStep = message.batch.toStep;
    } else if (message.type === 'finished' && message.runId === this.run.id) {
      this.facts.isComputed = true;
    } else {
      return;
    }
    this.requestFrame();
    this.publishStatus();
  }

  private requestFrame(): void {
    if (this.animationFrame === null) {
      this.animationFrame = requestAnimationFrame((time) => this.onFrame(time));
    }
  }

  private onFrame(time: number): void {
    this.animationFrame = null;
    const wallDeltaMs = this.lastFrameTime === null ? 0 : time - this.lastFrameTime;
    this.lastFrameTime = time;

    let spikeCount = 0;
    const timeline = this.timeline;
    if (timeline !== null) {
      const previousStep = Math.floor(this.clock.step);
      const step = Math.floor(this.clock.tick(wallDeltaMs, timeline.computedStep, timeline.totalSteps));
      timeline.forEachSpike(previousStep, step, (neuron) => {
        if (spikeCount === this.spikeBuffer.length) {
          const grown = new Int32Array(this.spikeBuffer.length * 2);
          grown.set(this.spikeBuffer);
          this.spikeBuffer = grown;
        }
        this.spikeBuffer[spikeCount] = neuron;
        spikeCount += 1;
        if (this.firedNeurons !== null && this.firedNeurons[neuron] === 0) {
          this.firedNeurons[neuron] = 1;
          this.facts.firedNeuronCount += 1;
        }
      });
      if (time - this.lastReportTime > PLAYBACK_REPORT_INTERVAL_MS) {
        this.lastReportTime = time;
        this.client.reportPlayback(this.run.id, step);
      }
    }

    let wantsMoreFrames = false;
    this.frameListeners.forEach((listener) => {
      wantsMoreFrames = listener({ spikes: this.spikeBuffer, spikeCount, wallDeltaMs }) || wantsMoreFrames;
    });
    if (time - this.lastStatusTime > STATUS_INTERVAL_MS) {
      this.lastStatusTime = time;
      this.publishStatus();
    }

    // Before the run starts there is nothing to animate; every worker message requests a frame of its own.
    const isPlaying = timeline !== null && !this.clock.isPaused && this.clock.step < timeline.totalSteps;
    if (isPlaying || wantsMoreFrames) {
      this.requestFrame();
    } else {
      // The next frame after a pause or the end must not count the idle gap as elapsed time.
      this.lastFrameTime = null;
      this.publishStatus();
    }
  }

  private publishStatus(): void {
    const next = derivePlaybackStatus(this.facts, this.clock);
    if (JSON.stringify(next) !== JSON.stringify(this.status)) {
      this.status = next;
      this.statusListeners.forEach((listener) => listener());
    }
  }
}
