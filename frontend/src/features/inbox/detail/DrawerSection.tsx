/* One titled section of the offer drawer. The heading is h3: the drawer's own title is the dialog's h2. */
import type { ReactNode } from 'react';

interface DrawerSectionProps {
  title: string;
  // A badge or short state beside the heading, e.g. the evidence rollup.
  aside?: ReactNode;
  children: ReactNode;
}

/** Render a drawer section with its heading. */
export function DrawerSection({ title, aside, children }: DrawerSectionProps): JSX.Element {
  return (
    <section className="offer-drawer__section">
      <div className="offer-drawer__section-head">
        <h3 className="offer-drawer__section-title">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
