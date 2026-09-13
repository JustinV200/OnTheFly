/* What the brain view shows: real published data, a ported model, an arbitrary input mapping, a legend and citations.
   Every count is read from the loaded brain file, never written into the code. */
import type { BrainStimulus } from '../../../../shared/flybrain/live';
import { Disclosure } from '../../../../shared/ui';
import type { BrainLayout } from '../../connectome/brainData';
import { MAX_POISSON_RATE_HZ } from '../../simulation/model/lifParameters';
import './RunDescription.css';

interface RunProvenanceProps {
  stimulus: BrainStimulus;
  layout: BrainLayout;
}

/** The "what you're seeing" disclosure: data source, model, input mapping, legend, citations and licence. */
export function RunProvenance({ stimulus, layout }: RunProvenanceProps): JSX.Element {
  const { header } = layout;
  const usedSenses = new Set<string>(stimulus.pulses.map((pulse) => pulse.sense));
  const senseLabels = header.inputs.senses.filter((sense) => usedSenses.has(sense.key)).map((sense) => sense.label.toLowerCase());

  return (
    <Disclosure summary="What you’re seeing">
      <div className="run-description__provenance">
        <p>
          {header.neuron_count.toLocaleString()} neurons and {header.edge_count.toLocaleString()} neuron-to-neuron connections (
          {header.synapse_count.toLocaleString()} synapses) from the {header.provenance.dataset}, simulated in this browser with a
          port of the {header.provenance.model}.
        </p>
        <p>
          The circuit’s receptor channels are assigned to real {senseLabels.join(' and ') || 'sensory neurons'} by a fixed table,
          and each channel drives its neurons at up to {MAX_POISSON_RATE_HZ} Hz. The assignment is arbitrary: a real fly doesn’t
          smell vendor names or see prices.
        </p>
        <p>
          Each input starts from a brain at rest. In this model, activity started by an input keeps reverberating after the
          input stops, because the model has nothing that would quiet it, so without the reset every later input would land
          on a brain still busy with the first.
        </p>
        <ul className="run-description__legend">
          <li>
            <span aria-hidden="true" className="run-description__swatch run-description__swatch--spike" /> A neuron that just fired
          </li>
          <li>
            <span aria-hidden="true" className="run-description__swatch run-description__swatch--input" /> A neuron the input drives
          </li>
          <li>
            <span aria-hidden="true" className="run-description__swatch run-description__swatch--neuron" /> A neuron at rest
          </li>
        </ul>
        <p>
          Each dot sits at the neuron’s annotated position, seen from the front; drag to turn the brain, double-click to reset.
          {header.unplaced_neuron_count > 0
            ? ` ${header.unplaced_neuron_count} neurons with no annotated position are simulated but not drawn.`
            : ''}
        </p>
        <p className="run-description__citations">
          {header.provenance.citations.join('. ')}. {header.provenance.licence_note}
        </p>
      </div>
    </Disclosure>
  );
}
