/* The merge UI for possible duplicate vendors, in a drawer opened from DuplicateVendorNotice. Suggestions come from the
   fly brain's name matching; nothing merges without the owner's click, and a merge never publishes anything. */
import type { FlyBrainAttribution } from '../../../../shared/flybrain/types';
import { Callout, Cluster, Drawer, Stack } from '../../../../shared/ui';
import { FlyBrainDisclosure } from '../../flybrain/FlyBrainDisclosure';
import { PlainFlyBrainBadge } from '../../flybrain/PlainFlyBrainBadge';
import type { VendorAliasSuggestion } from '../types';
import { AliasSuggestionRow } from './AliasSuggestionRow';
import './VendorAliasDrawer.css';

interface VendorAliasDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: VendorAliasSuggestion[];
  attributions: FlyBrainAttribution[];
  error: string | null;
  pendingAliasId: string | null;
  onMerge: (suggestion: VendorAliasSuggestion) => Promise<void>;
  onDismiss: (suggestion: VendorAliasSuggestion) => void;
}

/** Render every suggestion with its merge and dismiss buttons; says so once none are left. */
export function VendorAliasDrawer({ isOpen, onClose, suggestions, attributions, error, pendingAliasId, onMerge, onDismiss }: VendorAliasDrawerProps): JSX.Element {
  return (
    <Drawer
      description={
        <Cluster gap={1}>
          {attributions.map((attribution) => <PlainFlyBrainBadge attribution={attribution} key={attribution.component} />)}
        </Cluster>
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Possible duplicate vendors"
    >
      <Stack gap={5}>
        {error ? <Callout role="alert" tone="danger">{error}</Callout> : null}
        {suggestions.length > 0 ? (
          <ul className="alias-suggestions">
            {suggestions.map((suggestion) => (
              <li className="alias-suggestions__item" key={suggestion.alias.expense_id}>
                <AliasSuggestionRow
                  isPending={pendingAliasId === suggestion.alias.expense_id}
                  onDismiss={() => onDismiss(suggestion)}
                  onMerge={() => onMerge(suggestion)}
                  suggestion={suggestion}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="ui-text-muted">No possible duplicate vendors left to review.</p>
        )}
        <FlyBrainDisclosure attributions={attributions} />
      </Stack>
    </Drawer>
  );
}
