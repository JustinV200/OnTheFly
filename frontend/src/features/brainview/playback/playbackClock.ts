/* Converts wall-clock time into brain time at the chosen speed, never running ahead of what has been computed.
   Speed 0.1 means one millisecond of brain activity takes ten milliseconds on screen. */
import { TIME_STEP_MS } from '../simulation/model/lifParameters';

export type PlaybackSpeed = 0.05 | 0.1 | 0.25 | 1;

// The slowed-down default: fast enough to follow, slow enough to watch activity spread between regions.
export const DEFAULT_PLAYBACK_SPEED: PlaybackSpeed = 0.1;
// A frame gap longer than this (a hidden tab, a slow frame) is treated as this long, so playback never jumps.
const MAX_FRAME_GAP_MS = 100;

export class PlaybackClock {
  public speed: PlaybackSpeed = DEFAULT_PLAYBACK_SPEED;
  public isPaused = false;
  private position = 0;

  /** The current playback position in steps (fractional). */
  public get step(): number {
    return this.position;
  }

  /**
   * Advance by a frame's wall-clock duration and return the new position. Stops at computedStep (the simulation
   * hasn't got further yet) and at totalSteps (the end of the run).
   */
  public tick(wallDeltaMs: number, computedStep: number, totalSteps: number): number {
    if (!this.isPaused) {
      const brainMs = Math.min(wallDeltaMs, MAX_FRAME_GAP_MS) * this.speed;
      this.position = Math.min(this.position + brainMs / TIME_STEP_MS, computedStep, totalSteps);
    }
    return this.position;
  }

  /** Jump back to the start of the run. */
  public rewind(): void {
    this.position = 0;
  }
}
