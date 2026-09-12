/* Lets the owner choose what a listing discloses. Every choice starts at its private default.
   The incumbent's name carries a warning, because publishing it discloses a third party's pricing. */
import type { PublishChoices } from './types';

interface DisclosureChoicesProps {
  choices: PublishChoices;
  incumbentVendorName: string;
  onChange: (choices: PublishChoices) => void;
}

/** Render bidding-mode and incumbent-name choices as controlled inputs. */
export function DisclosureChoices({ choices, incumbentVendorName, onChange }: DisclosureChoicesProps): JSX.Element {
  const hasIncumbentName = incumbentVendorName.trim().length > 0;

  return (
    <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '12px', margin: '1rem 0', padding: '0.75rem 1rem' }}>
      <legend><strong>Disclosure choices</strong></legend>

      <p style={{ margin: '0 0 0.25rem' }}>Bidding mode (you can change it later; a change never applies to offers already made):</p>
      <label style={{ display: 'block' }}>
        <input
          checked={choices.bidding_mode === 'sealed'}
          name="bidding_mode"
          onChange={() => onChange({ ...choices, bidding_mode: 'sealed' })}
          type="radio"
        />{' '}
        Sealed (default): the public sees only how many offers exist
      </label>
      <label style={{ display: 'block' }}>
        <input
          checked={choices.bidding_mode === 'open'}
          name="bidding_mode"
          onChange={() => onChange({ ...choices, bidding_mode: 'open' })}
          type="radio"
        />{' '}
        Open: offer prices and scope go public, anonymized, so challengers can underbid
      </label>

      <label style={{ display: 'block', marginTop: '0.75rem' }}>
        <input
          checked={choices.show_incumbent_vendor && hasIncumbentName}
          disabled={!hasIncumbentName}
          onChange={(event) => onChange({ ...choices, show_incumbent_vendor: event.target.checked })}
          type="checkbox"
        />{' '}
        Show the current vendor’s name{hasIncumbentName ? ` (“${incumbentVendorName}”)` : ' (no name entered)'}
      </label>
      {choices.show_incumbent_vendor && hasIncumbentName ? (
        <p role="alert" style={{ backgroundColor: '#fffbeb', borderRadius: '8px', color: '#92400e', margin: '0.25rem 0 0', padding: '0.5rem' }}>
          ⚠ This publishes what a third party charges you. Your contract with them may restrict disclosing it. Leave this off
          unless you are sure.
        </p>
      ) : null}

      <p style={{ color: '#475569', margin: '0.75rem 0 0' }}>
        Exact street address: never collected by this form, so it can’t be published. Listings show an approximate area.
      </p>
    </fieldset>
  );
}
