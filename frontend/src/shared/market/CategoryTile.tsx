/* A small square with a category's initials, standing in for a market card's image. Decorative: the category name is
   always written beside it. Neutral on purpose, so no category looks more urgent or more "positive" than another. */
import { categoryLabel } from '../format/categoryLabel';
import './CategoryTile.css';

interface CategoryTileProps {
  category: string | null;
  size?: 'md' | 'lg';
}

/** Render the category monogram tile. */
export function CategoryTile({ category, size = 'md' }: CategoryTileProps): JSX.Element {
  const words = categoryLabel(category).split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0]?.slice(0, 2) ?? '?').toUpperCase();
  return (
    <span aria-hidden="true" className={`category-tile category-tile--${size}`}>
      {initials}
    </span>
  );
}
