/* The current vendor's name: typed privately, published only if the owner ticks the box, with the warning shown the
   moment it is ticked, because publishing it discloses a third party's pricing (CLAUDE.md, "Visibility"). */
import { Callout, Checkbox, Field, Input, Stack } from '../../../../shared/ui';
import type { PublishChoices } from '../../types';

interface VendorNameDisclosureProps {
  choices: PublishChoices;
  incumbentVendorName: string;
  onChoicesChange: (choices: PublishChoices) => void;
  onNameChange: (name: string) => void;
}

/** Render the name input, the opt-in checkbox (disabled until a name exists), and the disclosure warning. */
export function VendorNameDisclosure({ choices, incumbentVendorName, onChoicesChange, onNameChange }: VendorNameDisclosureProps): JSX.Element {
  const hasName = incumbentVendorName.trim().length > 0;
  const isShowingName = choices.show_incumbent_vendor && hasName;

  return (
    <Stack gap={3}>
      <Field hint="Hidden by default. Typing it here doesn’t publish it." label="Current vendor’s name (optional)">
        <Input onChange={(event) => onNameChange(event.target.value)} placeholder="e.g. Acme Facility Services" value={incumbentVendorName} />
      </Field>
      <Checkbox
        checked={isShowingName}
        disabled={!hasName}
        hint={hasName ? 'Off unless you tick it.' : 'Enter a name above first.'}
        label={hasName ? `Show “${incumbentVendorName.trim()}” on the public listing` : 'Show the current vendor’s name on the public listing'}
        onChange={(event) => onChoicesChange({ ...choices, show_incumbent_vendor: event.target.checked })}
      />
      {isShowingName ? (
        <Callout role="alert" title="This publishes what a third party charges you" tone="warning">
          Your contract with them may restrict disclosing it. Leave this off unless you are sure.
        </Callout>
      ) : null}
    </Stack>
  );
}
