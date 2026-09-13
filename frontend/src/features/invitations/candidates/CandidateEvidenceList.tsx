/* The evidence behind one candidate: each USAspending award its UEI won, and each web page its name search returned.
   Awards are identifier-level facts; web pages say they were matched by name only (CLAUDE.md, "Evidence and claims"). */
import { MoneyDisplay } from '../../../shared/components/MoneyDisplay';
import { formatTimestamp } from '../../../shared/format/formatTimestamp';
import type { AwardEvidence, CandidateEvidence, WebEvidence } from '../types';

interface CandidateEvidenceListProps {
  evidence: CandidateEvidence[];
}

/** Render awards first, then web pages, each with its own source link and retrieval date. */
export function CandidateEvidenceList({ evidence }: CandidateEvidenceListProps): JSX.Element {
  const awards = evidence.filter((record): record is AwardEvidence => record.kind === 'usaspending_award');
  const pages = evidence.filter((record): record is WebEvidence => record.kind === 'web_page');

  return (
    <>
      {awards.length > 0 ? (
        <>
          <p>
            {awards.length} prime contract {awards.length === 1 ? 'award' : 'awards'} to UEI {awards[0].recipient_uei} (USAspending
            public records, subawards not searched):
          </p>
          <ul className="candidate-row__sources">
            {awards.map((award) => <AwardItem award={award} key={award.generated_award_id ?? award.award_id} />)}
          </ul>
        </>
      ) : null}
      {pages.length > 0 ? (
        <>
          <p>Web pages from a name search — not identity-verified, and may describe a different business:</p>
          <ul className="candidate-row__sources">
            {pages.map((page) => (
              <li key={page.url}>
                <a href={page.url} rel="noreferrer noopener" target="_blank">{page.title ?? page.url}</a>
                {' '}· {page.source}, retrieved {formatTimestamp(page.retrieved_at, { dateOnly: true })}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

function AwardItem({ award }: { award: AwardEvidence }): JSX.Element {
  // Only the facts the award record carries; a missing field is left out rather than shown as zero or "unknown".
  const facts = [
    award.awarding_agency,
    // A calendar date ("2020-11-30"); read as UTC midnight so the date-only format shows that same day.
    award.start_date ? `started ${formatTimestamp(`${award.start_date}T00:00:00Z`, { dateOnly: true })}` : null,
    award.naics_code ? `NAICS ${award.naics_code}` : null,
    award.psc_code ? `PSC ${award.psc_code}` : null,
    award.place_of_performance_state ? `performed in ${award.place_of_performance_state}` : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <li>
      {award.url ? (
        <a href={award.url} rel="noreferrer noopener" target="_blank">Award {award.award_id}</a>
      ) : (
        <span>Award {award.award_id}</span>
      )}
      {award.amount_minor !== null ? <> · <MoneyDisplay amountMinor={award.amount_minor} currency={award.currency} /></> : null}
      {facts.length > 0 ? ` · ${facts.join(' · ')}` : null}
    </li>
  );
}
