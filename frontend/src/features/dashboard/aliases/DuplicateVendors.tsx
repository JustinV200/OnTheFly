/* Possible duplicate vendors on Spend: a one-line notice above the expense list ("1 possible duplicate vendor · Review")
   that opens the merge drawer. Renders nothing while there is nothing to review and nothing failed; a failed check is
   said out loud rather than read as "no duplicates". */
import { useState } from 'react';

import { Button, Callout } from '../../../shared/ui';
import { PlainFlyBrainBadge } from '../flybrain/PlainFlyBrainBadge';
import { VendorAliasDrawer } from './drawer/VendorAliasDrawer';
import { useVendorAliases } from './useVendorAliases';
import './DuplicateVendors.css';

interface DuplicateVendorsProps {
  /** Called after a merge succeeds so Spend can reload its expense rows. */
  onMerged: () => void;
}

/** Render the notice (or the failure) and the drawer it opens. */
export function DuplicateVendors({ onMerged }: DuplicateVendorsProps): JSX.Element | null {
  const { suggestions, attributions, error, pendingAliasId, merge, dismiss } = useVendorAliases();
  const [isOpen, setIsOpen] = useState(false);
  const count = suggestions.length;

  return (
    <>
      {count > 0 ? (
        <div className="duplicate-vendors">
          <span className="duplicate-vendors__text">
            <strong>{count} possible duplicate {count === 1 ? 'vendor' : 'vendors'}</strong>
            <span className="ui-text-muted"> · merging never publishes anything</span>
          </span>
          {attributions.map((attribution) => <PlainFlyBrainBadge attribution={attribution} key={attribution.component} />)}
          <Button aria-haspopup="dialog" className="duplicate-vendors__review" onClick={() => setIsOpen(true)} size="sm">
            Review
          </Button>
        </div>
      ) : null}
      {count === 0 && error && !isOpen ? (
        <Callout role="alert" tone="danger">{error}</Callout>
      ) : null}

      <VendorAliasDrawer
        attributions={attributions}
        error={error}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onDismiss={(suggestion) => void dismiss(suggestion)}
        onMerge={async (suggestion) => {
          if (await merge(suggestion)) {
            onMerged();
          }
        }}
        pendingAliasId={pendingAliasId}
        suggestions={suggestions}
      />
    </>
  );
}
