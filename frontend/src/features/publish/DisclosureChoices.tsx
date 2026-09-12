/* Shows the disclosure defaults that apply before publication.
   The toggles are visible even before full edit support lands in later phases. */
/** Render the disclosure-choice explainer used between draft and publish. */
export function DisclosureChoices(): JSX.Element {
  return (
    <section>
      <h3>Disclosure choices</h3>
      <ul>
        <li>Incumbent vendor name is hidden by default.</li>
        <li>Exact address is hidden by default.</li>
        <li>Bidding mode defaults to sealed.</li>
      </ul>
    </section>
  );
}
