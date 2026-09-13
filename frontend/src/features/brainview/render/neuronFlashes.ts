/* Tracks how brightly each neuron is flashing: a spike sets it to full, then it fades over a fixed stretch of wall time.
   Fading in wall time (not brain time) keeps flashes visible at every playback speed. Only lit neurons are visited. */

// How long a flash takes to fade out on screen.
const FLASH_FADE_MS = 450;

export class NeuronFlashes {
  // One byte per neuron, uploaded to the GPU as a normalised attribute.
  public readonly brightness: Uint8Array;
  private readonly level: Float32Array;
  private readonly litNeurons: Int32Array;
  private readonly isLit: Uint8Array;
  private litCount = 0;
  private isChanged = true;

  public constructor(neuronCount: number) {
    this.brightness = new Uint8Array(neuronCount);
    this.level = new Float32Array(neuronCount);
    this.litNeurons = new Int32Array(neuronCount);
    this.isLit = new Uint8Array(neuronCount);
  }

  /** True when brightness changed since the last call to takeChanged(), which clears the flag. */
  public takeChanged(): boolean {
    const wasChanged = this.isChanged;
    this.isChanged = false;
    return wasChanged;
  }

  public get hasLitNeurons(): boolean {
    return this.litCount > 0;
  }

  /** Light spikes[0..count) at full brightness. */
  public flash(spikes: Int32Array, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const neuron = spikes[index];
      this.level[neuron] = 1;
      this.brightness[neuron] = 255;
      if (this.isLit[neuron] === 0) {
        this.isLit[neuron] = 1;
        this.litNeurons[this.litCount] = neuron;
        this.litCount += 1;
      }
    }
    this.isChanged ||= count > 0;
  }

  /** Fade every lit neuron by a frame's worth of wall time, dropping those that reach zero. */
  public fade(wallDeltaMs: number): void {
    if (this.litCount === 0 || wallDeltaMs <= 0) {
      return;
    }
    const decrement = wallDeltaMs / FLASH_FADE_MS;
    let kept = 0;
    for (let index = 0; index < this.litCount; index += 1) {
      const neuron = this.litNeurons[index];
      const level = Math.max(0, this.level[neuron] - decrement);
      this.level[neuron] = level;
      this.brightness[neuron] = Math.round(level * 255);
      if (level > 0) {
        this.litNeurons[kept] = neuron;
        kept += 1;
      } else {
        this.isLit[neuron] = 0;
      }
    }
    this.litCount = kept;
    this.isChanged = true;
  }

  /** Put every neuron out at once (a replay or a new run). */
  public clear(): void {
    for (let index = 0; index < this.litCount; index += 1) {
      const neuron = this.litNeurons[index];
      this.level[neuron] = 0;
      this.brightness[neuron] = 0;
      this.isLit[neuron] = 0;
    }
    this.litCount = 0;
    this.isChanged = true;
  }
}
