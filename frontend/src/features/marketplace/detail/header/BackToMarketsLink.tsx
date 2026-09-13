/* The small "← Markets" link at the top of a market page and of the "isn't public" page, so both lead back to the
   board the same way. */
import { Link } from 'react-router-dom';

import { Icon } from '../../../../shared/ui';
import './BackToMarketsLink.css';

/** Render the back link to the market board. */
export function BackToMarketsLink(): JSX.Element {
  return (
    <Link className="back-to-markets" to="/marketplace">
      <Icon name="arrow-left" size={14} />
      Markets
    </Link>
  );
}
