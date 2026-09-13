/* A growable list of neuron indices backed by a typed array, reused step after step without allocating.
   Used for the synaptic delay line, where one slot can briefly hold thousands of spikes. */

const INITIAL_CAPACITY = 256;

export class SpikeList {
  public values: Int32Array = new Int32Array(INITIAL_CAPACITY);
  public length = 0;

  /** Append one neuron index, doubling the backing array when it is full. */
  public push(neuron: number): void {
    if (this.length === this.values.length) {
      const grown = new Int32Array(this.values.length * 2);
      grown.set(this.values);
      this.values = grown;
    }
    this.values[this.length] = neuron;
    this.length += 1;
  }

  /** Empty the list, keeping its capacity for the next use. */
  public clear(): void {
    this.length = 0;
  }
}
