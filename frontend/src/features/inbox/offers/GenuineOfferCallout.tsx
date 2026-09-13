/* Puts any genuine counteroffer front and centre: real amount, terms, timestamp, and how it arrived.
   Shown only for offers whose stored provenance is genuine; simulated offers never appear here (roadmap 09, "The real counteroffer, front and centre"). */
import { ApiQueryState } from '../../../shared/api/useApiQuery';
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import { ProvenanceBadge } from '../../../shared/provenance/ProvenanceBadge';
import type { OwnerChallenge, OwnerChallengeListResponse } from '../types';

const CHANNEL = new Map<string, string>([
  ['challenger_submitted', 'Came through the platform: the business submitted it itself.'],
  ['captured_off_platform', 'Captured off the platform: a real quote received by email, phone, or in person, entered with its original time.'],
]);

interface GenuineOfferCalloutProps {
  offers: ApiQueryState<OwnerChallengeListResponse>;
}

/** Render one highlighted card per genuine offer, or nothing when every offer is simulated. */
export function GenuineOfferCallout({ offers }: GenuineOfferCalloutProps): JSX.Element | null {
  const genuine = (offers.data?.challenges ?? []).filter((offer) => CHANNEL.has(offer.provenance));
  if (genuine.length === 0) {
    return null;
  }
  return (
    <section style={{ marginBottom: '1rem' }}>
      {genuine.map((offer) => <GenuineOfferCard key={offer.id} offer={offer} />)}
    </section>
  );
}

function GenuineOfferCard({ offer }: { offer: OwnerChallenge }): JSX.Element {
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
    <article style={{ backgroundColor: '#ecfdf5', border: '3px solid #047857', borderRadius: '12px', marginBottom: '0.75rem', padding: '1rem' }}>
      <div style={{ color: '#065f46', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Genuine counteroffer from a real business
      </div>
      <h3 style={{ margin: '0.25rem 0' }}>{offer.challenger_name ?? 'Unknown business'}</h3>
      <p style={{ fontSize: '1.5rem', margin: '0 0 0.25rem' }}>
        <MoneyDisplay amountMinor={offer.price_minor} currency={offer.price_currency} /> / {offer.billing_frequency}
      </p>
      <p style={{ margin: '0 0 0.25rem' }}>
        Received {formatTimestamp(offer.submitted_at)}
        {offer.revised_at ? `, revised ${formatTimestamp(offer.revised_at)}` : ''}. <ProvenanceBadge kind="offer" value={offer.provenance} />
      </p>
      <p style={{ margin: '0 0 0.25rem' }}>{CHANNEL.get(offer.provenance)}</p>
      {terms.length ? <p style={{ margin: '0 0 0.25rem' }}>Terms as given: {terms.join('; ')}.</p> : null}
      {offer.message_to_owner ? <blockquote style={{ borderLeft: '3px solid #047857', margin: '0.5rem 0 0', paddingLeft: '0.75rem' }}>{offer.message_to_owner}</blockquote> : null}
    </article>
  );
}
