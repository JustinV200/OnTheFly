/* Five dots, the first `rating` filled, beside the words "3 of 5". The words carry the meaning; the dots are decoration
   in the fly-brain violet, so the rating never borrows the look of a status or a score elsewhere in the app. */
import { joinClassNames } from '../../../shared/ui';
import type { FlyRating } from './flyOpinion';

const DOTS: readonly number[] = [1, 2, 3, 4, 5];

interface RatingDotsProps {
  rating: FlyRating;
}

/** Render the rating as filled dots plus its text. */
export function RatingDots({ rating }: RatingDotsProps): JSX.Element {
  return (
    <span className="fly-opinion__rating">
      <span aria-hidden="true" className="fly-opinion__dots">
        {DOTS.map((dot) => (
          <span className={joinClassNames('fly-opinion__dot', dot <= rating && 'fly-opinion__dot--filled')} key={dot} />
        ))}
      </span>
      <span className="fly-opinion__rating-text">{rating} of 5</span>
    </span>
  );
}
