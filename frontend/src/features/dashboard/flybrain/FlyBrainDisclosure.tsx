/* "How was this found?" for a fly-brain panel on Spend: the circuit names, what each did, and the deterministic-code,
   no-AI-model note, once per panel behind a disclosure. The panel's visible PlainFlyBrainBadge stays outside it, so the
   output is labelled as fly-brain before anyone opens this. */
import { FlyBrainNote } from '../../../shared/flybrain/FlyBrainNote';
import type { FlyBrainAttribution } from '../../../shared/flybrain/types';
import { Disclosure } from '../../../shared/ui';

interface FlyBrainDisclosureProps {
  attributions: FlyBrainAttribution[];
}

/** Render the disclosure around FlyBrainNote; nothing when the response named no circuits. */
export function FlyBrainDisclosure({ attributions }: FlyBrainDisclosureProps): JSX.Element | null {
  if (attributions.length === 0) {
    return null;
  }
  return (
    <Disclosure summary="How the fly brain found this">
      <FlyBrainNote attributions={attributions} />
    </Disclosure>
  );
}
