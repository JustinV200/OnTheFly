/* The market board's loading state: a named status line over placeholder cards shaped like MarketCard, so the grid
   doesn't jump when the feed arrives. */
import { Skeleton, Spinner } from '../../../shared/ui';
import { MarketGrid } from '../grid/MarketGrid';
import './BoardSkeleton.css';

const PLACEHOLDER_COUNT = 6;

/** Render the loading label and placeholder market cards. */
export function BoardSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" className="board-skeleton" role="status">
      <p className="board-skeleton__label">
        <Spinner size="sm" />
        Loading markets…
      </p>
      <MarketGrid>
        {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
          <div aria-hidden="true" className="board-skeleton__card" key={index}>
            <div className="board-skeleton__header">
              <Skeleton height="40px" shape="block" width="40px" />
              <div className="board-skeleton__heading">
                <Skeleton width="60%" />
                <Skeleton width="40%" />
              </div>
            </div>
            <Skeleton height="2rem" shape="block" width="50%" />
            <Skeleton width="90%" />
            <div className="board-skeleton__meta">
              <Skeleton shape="pill" width="6rem" />
              <Skeleton shape="pill" width="4rem" />
              <Skeleton shape="pill" width="5rem" />
            </div>
          </div>
        ))}
      </MarketGrid>
    </div>
  );
}
