/* "Bidding": when offers close, whether offer prices are public, and whether the current vendor is named.
   Every choice starts at its private default: no deadline, sealed bidding, vendor hidden (CLAUDE.md, "Marketplace mechanics"). */
import { Field, Input, Radio, Stack } from '../../../../shared/ui';
import type { PublishChoices } from '../../types';
import { FormSection } from '../fields/FormSection';
import type { ScopeFormChange, ScopeFormValues } from '../state/scopeFormValues';
import { VendorNameDisclosure } from './VendorNameDisclosure';
import './BiddingFields.css';

interface BiddingFieldsProps {
  values: ScopeFormValues;
  choices: PublishChoices;
  onChange: ScopeFormChange;
  onChoicesChange: (choices: PublishChoices) => void;
}

/** Render the deadline, the sealed/open choice as two described tiles, and the vendor-name disclosure. */
export function BiddingFields({ values, choices, onChange, onChoicesChange }: BiddingFieldsProps): JSX.Element {
  return (
    <FormSection description="Each choice starts at its default: no deadline, sealed bidding, vendor name hidden." title="Bidding">
      <Stack gap={5}>
        <Field hint="Offers close at the end of this day. Blank means no deadline." label="Offer deadline (optional)">
          <Input className="publish-bidding__date" onChange={(event) => onChange({ deadlineDate: event.target.value })} type="date" value={values.deadlineDate} />
        </Field>

        <fieldset className="publish-bidding__modes">
          <legend className="publish-bidding__legend">Bidding mode</legend>
          <p className="publish-bidding__intro">You can change it later; a change never applies to offers already made.</p>
          <div className="publish-bidding__options">
            <Radio
              checked={choices.bidding_mode === 'sealed'}
              className="publish-bidding__option"
              hint="The public sees only how many offers exist."
              label="Sealed (default)"
              name="bidding_mode"
              onChange={() => onChoicesChange({ ...choices, bidding_mode: 'sealed' })}
            />
            <Radio
              checked={choices.bidding_mode === 'open'}
              className="publish-bidding__option"
              hint="Offer prices and scope go public, never who made them, so bidders can underbid."
              label="Open"
              name="bidding_mode"
              onChange={() => onChoicesChange({ ...choices, bidding_mode: 'open' })}
            />
          </div>
        </fieldset>

        <VendorNameDisclosure
          choices={choices}
          incumbentVendorName={values.incumbentVendorName}
          onChoicesChange={onChoicesChange}
          onNameChange={(name) => onChange({ incumbentVendorName: name })}
        />
      </Stack>
    </FormSection>
  );
}
