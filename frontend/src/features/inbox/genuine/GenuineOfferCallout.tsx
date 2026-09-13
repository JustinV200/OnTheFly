/* Puts any genuine counteroffer front and centre: real amount, terms, timestamp, and how it arrived, with a button to the
   same offer's drawer in the ranked list. Shown only for offers whose stored provenance is genuine; simulated offers never
   appear here (roadmap 09, "The real counteroffer, front and centre"). */
import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import { Button, Card, Icon, Stack, Stat } from '../../../shared/ui';
import type { OwnerChallenge, OwnerChallengeListResponse } from '../types';
import './GenuineOfferCallout.css';

const CHANNEL = new Map<string, string>([
  ['challenger_submitted', 'Came through the platform: the business submitted it itself.'],
  ['captured_off_platform', 'Captured off the platform: a real quote received by email, phone, or in person, entered with its original time.'],
]);

interface GenuineOfferCalloutProps {
  offers: ApiQueryState<OwnerChallengeListResponse>;
  // Opens the offer drawer; an owner offer's id is the ranked list's challenge id.
  onOpenOffer: (challengeId: string) => void;
}

/** Render one highlighted card per genuine offer, or nothing when every offer is simulated. */
export function GenuineOfferCallout({ offers, onOpenOffer }: GenuineOfferCalloutProps): JSX.Element | null {
  const genuine = (offers.data?.challenges ?? []).filter((offer) => CHANNEL.has(offer.provenance));
  if (genuine.length === 0) {
    return null;
  }
  return (
    <Stack gap={3}>
      {genuine.map((offer) => <GenuineOfferCard key={offer.id} offer={offer} onOpen={() => onOpenOffer(offer.id)} />)}
    </Stack>
  );
}

function GenuineOfferCard({ offer, onOpen }: { offer: OwnerChallenge; onOpen: () => void }): JSX.Element {
  const terms = [
    offer.scope_included.length ? `includes ${offer.scope_included.join(', ')}` : null,
    offer.scope_excluded.length ? `excludes ${offer.scope_excluded.join(', ')}` : null,
    offer.setup_fee_minor ? 'setup fee applies' : null,
    offer.minimum_term ? `minimum term ${offer.minimum_term}` : null,
    offer.site_visit_required ? 'price depends on a site visit' : null,
    offer.availability,
    offer.other_conditions,
  ].filter(Boolean);

  return (
    <Card
      actions={(
        <Button aria-haspopup="dialog" iconEnd={<Icon name="chevron-right" size={16} />} onClick={onOpen} size="sm">
          Details
        </Button>
      )}
      as="article"
      className="genuine-offer"
      title={(
        <span className="genuine-offer__title">
          <Icon name="check-circle" size={18} />
          Genuine counteroffer from a real business
        </span>
      )}
    >
      <Stack gap={3}>
        <p className="genuine-offer__business">{offer.challenger_name ?? 'Unknown business'}</p>
        <Stat
          caption={(
            <>
              <ProvenanceBadge kind="offer" value={offer.provenance} />
              <span>
                Received {formatTimestamp(offer.submitted_at)}
                {offer.revised_at ? `, revised ${formatTimestamp(offer.revised_at)}` : ''}
              </span>
            </>
          )}
          label="Offered price"
          size="lg"
          unit={`/ ${offer.billing_frequency}`}
          value={<MoneyDisplay amountMinor={offer.price_minor} currency={offer.price_currency} />}
        />
        <p>{CHANNEL.get(offer.provenance)}</p>
        {terms.length ? <p>Terms as given: {terms.join('; ')}.</p> : null}
        {offer.message_to_owner ? <blockquote className="genuine-offer__message">{offer.message_to_owner}</blockquote> : null}
      </Stack>
    </Card>
  );
}
