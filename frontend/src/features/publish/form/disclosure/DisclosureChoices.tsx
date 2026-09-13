/* Lets the owner choose what a listing discloses. Every choice starts at its private default.
   The incumbent's name carries a warning, because publishing it discloses a third party's pricing. */
import { BiddingModePill } from '../../../../shared/components/BiddingModePill';
import { Badge, Callout, Checkbox, Cluster, Field, Icon, Input, Radio, Stack } from '../../../../shared/ui';
import type { PublishChoices } from '../../types';
import { FormSection } from '../FormSection';
import './DisclosureChoices.css';

interface DisclosureChoicesProps {
  choices: PublishChoices;
  incumbentVendorName: string;
  onChange: (choices: PublishChoices) => void;
  onIncumbentVendorNameChange: (name: string) => void;
}

/** Render bidding-mode, incumbent-name, and address disclosure as controlled native inputs. */
export function DisclosureChoices({ choices, incumbentVendorName, onChange, onIncumbentVendorNameChange }: DisclosureChoicesProps): JSX.Element {
  const hasIncumbentName = incumbentVendorName.trim().length > 0;
  const isShowingIncumbent = choices.show_incumbent_vendor && hasIncumbentName;

  return (
    <FormSection description="Every choice starts at its private default." title="Disclosure choices">
      <Stack gap={4}>
        <fieldset className="publish-disclosure">
          <legend className="publish-disclosure__legend">Bidding mode</legend>
          <Cluster className="publish-disclosure__intro" justify="between">
            <span>You can change it later; a change never applies to offers already made.</span>
            <BiddingModePill mode={choices.bidding_mode} />
          </Cluster>
          <div className="publish-disclosure__options">
            <Radio
              checked={choices.bidding_mode === 'sealed'}
              className="publish-disclosure__option"
              hint="The public sees only how many offers exist."
              label="Sealed (default)"
              name="bidding_mode"
              onChange={() => onChange({ ...choices, bidding_mode: 'sealed' })}
            />
            <Radio
              checked={choices.bidding_mode === 'open'}
              className="publish-disclosure__option"
              hint="Offer prices and scope go public, anonymized, so challengers can underbid."
              label="Open"
              name="bidding_mode"
              onChange={() => onChange({ ...choices, bidding_mode: 'open' })}
            />
          </div>
        </fieldset>

        <fieldset className="publish-disclosure">
          <legend className="publish-disclosure__legend">Current vendor’s name</legend>
          <Stack gap={3}>
            <Field hint="Hidden by default. Entering it here doesn’t publish it." label="Current vendor name (optional, hidden by default)">
              <Input onChange={(event) => onIncumbentVendorNameChange(event.target.value)} value={incumbentVendorName} />
            </Field>
            <Checkbox
              checked={isShowingIncumbent}
              disabled={!hasIncumbentName}
              hint={hasIncumbentName ? 'Off unless you tick it. Showing it discloses what a third party charges you.' : 'Enter a name above first.'}
              label={`Show the current vendor’s name${hasIncumbentName ? ` (“${incumbentVendorName}”)` : ' (no name entered)'}`}
              onChange={(event) => onChange({ ...choices, show_incumbent_vendor: event.target.checked })}
            />
            {isShowingIncumbent ? (
              <Callout role="alert" title="This publishes what a third party charges you" tone="warning">
                Your contract with them may restrict disclosing it. Leave this off unless you are sure.
              </Callout>
            ) : null}
          </Stack>
        </fieldset>

        <div className="publish-disclosure">
          <Cluster justify="between">
            <span className="publish-disclosure__title">Exact street address</span>
            <Badge icon={<Icon name="lock" />} tone="private">Never public</Badge>
          </Cluster>
          <p className="publish-disclosure__note">Never collected by this form, so it can’t be published. Listings show an approximate area.</p>
        </div>
      </Stack>
    </FormSection>
  );
}
