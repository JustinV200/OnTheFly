/* Plain-string formatting for text inside the offer chart's SVG (<text>, <title>, aria-label), which can't hold a
   MoneyDisplay element. The money formatter mirrors MoneyDisplay's so a price reads the same in the chart as beside it. */
import { formatTimestamp, parseApiTimestamp } from '../../../../shared/format/formatTimestamp';
import { provenanceLabel } from '../../../../shared/provenance/provenanceLabel';
import type { LeaderboardEntry } from '../../types';

const AXIS_TIME = new Intl.DateTimeFormat('en-US', { day: 'numeric', hour: 'numeric', minute: '2-digit', month: 'short' });

/** Format minor units as "$1,950.00", the same way MoneyDisplay does. */
export function moneyText(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { currency, style: 'currency' }).format(amountMinor / 100);
}

/** Format a round tick amount as "$1,900" for the price axis. */
export function axisMoneyText(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { currency, maximumFractionDigits: 0, minimumFractionDigits: 0, style: 'currency' }).format(amountMinor / 100);
}

/** Format epoch milliseconds as "Sep 13, 1:18 AM" in the viewer's zone, for the time axis. */
export function axisTimeText(time: number): string {
  return AXIS_TIME.format(new Date(time));
}

/** Return epoch milliseconds for an entry's submission time (zone-less API values are UTC). */
export function submittedTime(entry: LeaderboardEntry): number {
  return parseApiTimestamp(entry.submitted_at).getTime();
}

/** Describe one plotted offer in a sentence: price per month, scope covered, when, and where it came from. No identity. */
export function describeOffer(entry: LeaderboardEntry, currentScopeVersion: number): string {
  const scope = `${Math.round(entry.scope_completeness * 100)}% of scope`;
  const version = entry.is_current_scope_version ? '' : ` (answered scope v${entry.answered_scope_version_number}, current is v${currentScopeVersion})`;
  return [
    `${moneyText(entry.normalized_price_minor, entry.price_currency)} per month`,
    `${scope}${version}`,
    `submitted ${formatTimestamp(entry.submitted_at)}`,
    `offer: ${provenanceLabel('offer', entry.provenance).text}`,
  ].join(' · ');
}
