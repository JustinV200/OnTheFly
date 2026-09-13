/* When the offer arrived, when it was last revised, how many earlier versions are kept, and the bidding mode it was made
   under. The count comes from the offer's trace, fetched only while this drawer is open, because no inbox endpoint lists
   revisions; the versions themselves stay private to the backend until one does. */
import { useApiQuery } from '../../../../shared/api/useApiQuery';
import { BiddingModePill } from '../../../../shared/components/BiddingModePill';
import { formatTimestamp } from '../../../../shared/format/formatTimestamp';
import type { OfferTrace } from '../../../trace/types';
import type { InboxChallenge } from '../../types';
import { TermList } from '../TermList';

/** Render the offer's history facts. */
export function OfferHistory({ offer }: { offer: InboxChallenge }): JSX.Element {
  const trace = useApiQuery<OfferTrace>(`/api/challenges/${offer.challenge_id}/trace`);

  let earlierVersions: string;
  if (trace.data) {
    const count = trace.data.offer.revision_count;
    earlierVersions = count === 0 ? 'None' : `${count} kept`;
  } else if (trace.error) {
    earlierVersions = `Couldn’t load: ${trace.error.message}`;
  } else {
    earlierVersions = 'Loading…';
  }

  return (
    <TermList
      terms={[
        { label: 'Received', value: formatTimestamp(offer.submitted_at) },
        { label: 'Last revised', value: offer.revised_at ? formatTimestamp(offer.revised_at) : 'Not revised' },
        { label: 'Earlier versions', value: earlierVersions },
        {
          label: 'Made under',
          // The mode recorded on the offer itself; changing the listing's mode later never alters it.
          value: <BiddingModePill mode={offer.bidding_mode_at_submission} />,
        },
      ]}
    />
  );
}
