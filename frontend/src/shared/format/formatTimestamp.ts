/* Formats API timestamps for display, always with a timezone so "when" is never ambiguous on stage.
   Treats zone-less ISO strings as UTC: SQLite drops tzinfo, but the backend only ever stores UTC. */
// Explicit fields, not dateStyle/timeStyle: browsers throw "Invalid option" when those are combined
// with timeZoneName, and at module load that blanks the whole app before any error boundary exists.
const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  month: 'short',
  timeZoneName: 'short',
  year: 'numeric',
});
// Date-only values are calendar dates stored at UTC midnight (e.g. a transaction's posted date);
// formatting them in the viewer's zone would show the previous day west of UTC.
const DATE_ONLY = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC', year: 'numeric' });
const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/;

/** Parse an API timestamp into a Date, reading a zone-less value as UTC rather than local time. */
export function parseApiTimestamp(value: string): Date {
  return new Date(HAS_ZONE.test(value) ? value : `${value}Z`);
}

/** Return "Sep 10, 2026, 8:30 AM PDT", or date only when dateOnly is set. */
export function formatTimestamp(value: string, options: { dateOnly?: boolean } = {}): string {
  const date = parseApiTimestamp(value);
  if (Number.isNaN(date.getTime())) {
    // Show the raw value rather than "Invalid Date" so a bad timestamp is visible, not hidden.
    return value;
  }
  return (options.dateOnly ? DATE_ONLY : DATE_TIME).format(date);
}
