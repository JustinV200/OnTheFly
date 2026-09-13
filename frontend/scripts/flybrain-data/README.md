# Fly brain data

Builds `frontend/public/flybrain/fly-brain-783.bin.gz`, the whole-brain wiring the simulated fly brain view
(`frontend/src/features/brainview`) runs in a Web Worker. The app's results never depend on this file, with one labelled
exception: the fruit fly's opinion bubble on an offer (`features/brainview/opinion`) reads its yes/no and rating off the
spike counts of two trials run here. It is presented as a toy and decides nothing. The view plays a response's
`brain_stimulus` through it alongside the result, and nothing waits on it.

## Build

```sh
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # or your platform's equivalent
.venv/Scripts/python build_brain_data.py --cache-dir <folder for ~135 MB of downloads>
```

The build downloads any source missing from the cache, takes about 30 seconds, and is deterministic: the same sources
produce a byte-identical file (fixed seeds, gzip mtime 0).

## Sources and licences

| File | From | Licence |
|---|---|---|
| `Connectivity_783.parquet`, `Completeness_783.csv` | [philshiu/Drosophila_brain_model](https://github.com/philshiu/Drosophila_brain_model), the model's own inputs for FlyWire release 783 | Repository: MIT. Data derived from FlyWire. |
| `Supplemental_file1_neuron_annotations.tsv` | [flyconnectome/flywire_annotations](https://github.com/flyconnectome/flywire_annotations) (Schlegel et al. 2024) | GitHub reports no licence file for this repository. |

The FlyWire release 783 connectivity on Zenodo ([10.5281/zenodo.10676866](https://zenodo.org/records/10676866)) is
published under CC BY 4.0. Some third-party projects describe other FlyWire downloads as CC BY-NC 4.0. **Confirm the
terms of the annotation file (positions and cell classes) before any use beyond the hackathon.** Credit is required
either way. The viewer shows the citations from the file header:

- Dorkenwald et al. (2024), *Neuronal wiring diagram of an adult brain*, Nature
- Schlegel et al. (2024), *Whole-brain annotation and multi-connectome cell typing of Drosophila*, Nature
- Shiu et al. (2024), *A Drosophila computational brain model reveals sensorimotor processing*, Nature

## What is in the file

It holds all 138,639 neurons of the model and all 15,091,983 connections (54,492,922 synapses). No synapse-count
threshold is applied, because dropping connections under 5 synapses would remove 37% of the synaptic weight and change
the model.

Layout (little-endian, then gzip):

- `"FLYB"`, then a uint32 format version (1), then a uint32 header length, then the JSON header.
- The header holds the counts, the position quantisation, display groups with label anchors, input table sizes,
  provenance, and the ordered section list with byte lengths.
- Sections, in header order:
  - `positions`: int16 x, y, z per neuron. These are annotation anchor points in nm, centred and quantised.
  - `display_groups`: uint8 per neuron, 255 for the 14 neurons with no annotation. Those are simulated but not drawn.
  - `is_inhibitory`: uint8 per neuron. In the model, a neuron's sign is the same for every synapse it makes, and the
    build checks this.
  - `row_lengths`: a varint per neuron.
  - `target_deltas`: a varint per connection. Each value is the target minus the previous target in the same row.
  - `synapse_counts_minus_one`: a varint per connection.
  - `inputs_olfactory` and `inputs_visual`: uint32 × 1024 × 8. Row *r* lists the neurons that receptor channel *r*
    drives.

Neurons are stored sorted by super class, cell class, cell type and side. Connected neurons then get nearby indices,
which makes the file about a third smaller. Every index is remapped consistently.

### Input tables

The app's circuits hash features onto 1,024 receptor channels. The tables map each channel to eight real sensory
neurons. **The assignment is arbitrary and the viewer says so.**

- **Olfactory:** each channel stays within one olfactory receptor type (glomerulus). Channels are dealt evenly across
  the 53 typed receptor types, and untyped neurons are left out.
- **Visual:** each channel picks eight photoreceptors (R1-6, R7 or R8) at random from both eyes.

## Model and validation

`frontend/src/features/brainview/simulation/model` ports Shiu et al.'s `model.py` defaults:

- Leaky integrate-and-fire neurons: rest and reset −52 mV, threshold −45 mV, τm 20 ms, τsyn 5 ms.
- Refractory period 2.2 ms (0 for stimulated neurons), synaptic delay 1.8 ms, 0.275 mV per synapse.
- Poisson input at up to 150 Hz with a 68.75 mV event weight.
- Exact linear integration with 0.1 ms steps.

It follows Brian2's per-step order: state update, threshold, synaptic delivery and Poisson input, then reset.

One Brian2 behaviour is easy to miss. Variables marked `(unless refractory)` become conditional writes, so **synaptic
input that reaches a refractory neuron is discarded**. The first port missed this and produced about twice the
published activity. `lifNetwork.ts` now matches it.

Checked on 2026-09-13 against the published `model.py` running in Brian2 2.10.1 (numpy target), on the same release
783 data:

- **Fixed input, sugar/water gustatory neurons (right side):** 62 neurons given fixed input spike times for 300 ms.
  Both produced 113,910 spikes, identical neuron by neuron and step by step.
- **Fixed input, olfactory neurons:** the 117 smell receptor neurons from one real stimulus, with input for 150 ms and
  silence to 600 ms. Both produced 281,118 identical spikes.
- **Poisson input:** 8 × 1 s trials at 150 Hz on the same 62 neurons. Mean spikes per trial were 458,650 (Brian2)
  and 460,340 (browser engine). Per-neuron rates correlated at 0.9999 across the roughly 9,000 neurons that fired.

The comparison harness was a one-off in a scratch directory and is not checked in. This README records its method and
results.

Simulating 1 s of brain time took about 6 s under Node 24 on the development laptop, for a strong stimulus.

### Differences from the published model

1. **Resting neurons are skipped.** A neuron whose membrane and conductance are both within 0.001 mV of rest, with no
   input, is snapped to rest and not integrated until input arrives. That value is 7,000 times smaller than the
   distance to threshold, and the fixed-input comparisons above were identical with it in place.
2. **Each input slot starts from rest.** In the model, activity started by smell input keeps reverberating after the
   input stops. The model has no adaptation, and the olfactory check above confirms the behaviour in Brian2 itself.
   The viewer therefore runs each slot of pulses as its own trial from rest, like separate runs of `model.py`, so later
   inputs don't land on a brain still busy with the first.
3. **Poisson events are drawn differently.** They come from geometric waiting times with a seed derived from the
   stimulus. The distribution matches Brian2's per-step Bernoulli draws; the individual random numbers differ.
4. **Inputs are assigned by table.** Receptor channels drive neurons through the input tables above, instead of named
   FlyWire neuron ids.
