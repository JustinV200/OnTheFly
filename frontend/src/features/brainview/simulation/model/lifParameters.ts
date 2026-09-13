/* The leaky integrate-and-fire constants of Shiu et al. (2024), copied from their model.py default_params, plus the
   per-step coefficients derived from them. Changing a value here makes the viewer's "Shiu et al. model" label untrue. */

// Brian2's default clock, which the published model runs on.
export const TIME_STEP_MS = 0.1;

// Kakaria and de Bivort 2017, as cited in model.py. Rest and reset are equal, so a silent neuron sits exactly at rest.
const RESTING_POTENTIAL_MV = -52;
const THRESHOLD_POTENTIAL_MV = -45;
const MEMBRANE_TIME_CONSTANT_MS = 20;
// Jürgensen et al., as cited in model.py.
const SYNAPTIC_TIME_CONSTANT_MS = 5;
// Lazar et al., as cited in model.py.
const REFRACTORY_PERIOD_MS = 2.2;
// Paul et al. 2015, as cited in model.py.
const SYNAPTIC_DELAY_MS = 1.8;

// The model's one free parameter: each synapse in a connection adds this much to the target's conductance term.
export const WEIGHT_PER_SYNAPSE_MV = 0.275;
// model.py's default Poisson input rate for a stimulated neuron.
export const MAX_POISSON_RATE_HZ = 150;
// w_syn * f_poi (f_poi = 250): one Poisson event lifts the membrane far past threshold, so every event is a spike.
export const POISSON_EVENT_MV = WEIGHT_PER_SYNAPSE_MV * 250;

// Neurons are tracked relative to rest, so "membrane" 0 is -52 mV and threshold is +7 mV.
export const THRESHOLD_ABOVE_REST_MV = THRESHOLD_POTENTIAL_MV - RESTING_POTENTIAL_MV;

export const SYNAPTIC_DELAY_STEPS = Math.round(SYNAPTIC_DELAY_MS / TIME_STEP_MS);
export const REFRACTORY_STEPS = Math.round(REFRACTORY_PERIOD_MS / TIME_STEP_MS);

// Exact solution of the linear system dv/dt = (g - v) / tau_m, dg/dt = -g / tau_s over one step (Brian2's "linear"
// method gives the same numbers): v' = v * membraneDecay + g * conductanceToMembrane, g' = g * conductanceDecay.
export const MEMBRANE_DECAY = Math.exp(-TIME_STEP_MS / MEMBRANE_TIME_CONSTANT_MS);
export const CONDUCTANCE_DECAY = Math.exp(-TIME_STEP_MS / SYNAPTIC_TIME_CONSTANT_MS);
export const CONDUCTANCE_TO_MEMBRANE =
  (SYNAPTIC_TIME_CONSTANT_MS / (SYNAPTIC_TIME_CONSTANT_MS - MEMBRANE_TIME_CONSTANT_MS)) *
  (CONDUCTANCE_DECAY - MEMBRANE_DECAY);

// Below this (in mV, for both variables) a neuron with no input is set exactly to rest and stops being integrated.
// It is 7,000 times smaller than the distance to threshold, so it could only change a spike for a neuron that lands
// within a thousandth of a millivolt of threshold. This is a deliberate approximation: skipping the silent majority of
// neurons is what makes a whole-brain step cheap enough for a browser (README.md, "Differences from the published model").
export const QUIESCENT_EPSILON_MV = 1e-3;
