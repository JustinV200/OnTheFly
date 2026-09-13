/* The On the Fly mark: a stylised fly on the brand square. Inline SVG, so the shell needs no image request.
   The favicon in index.html is the same drawing; change both together. */

interface BrandMarkProps {
  size?: number;
}

/** Render the decorative brand mark; the wordmark beside it carries the name. */
export function BrandMark({ size = 28 }: BrandMarkProps): JSX.Element {
  return (
    <svg aria-hidden="true" focusable="false" height={size} viewBox="0 0 32 32" width={size}>
      {/* Filled through style: presentation attributes can't be relied on to resolve a CSS custom property. */}
      <rect height="32" rx="8" style={{ fill: 'var(--color-brand)' }} width="32" />
      <g style={{ fill: 'var(--color-on-brand)' }}>
        <ellipse cx="10.2" cy="18.6" fillOpacity="0.55" rx="3.9" ry="8.2" transform="rotate(38 10.2 18.6)" />
        <ellipse cx="21.8" cy="18.6" fillOpacity="0.55" rx="3.9" ry="8.2" transform="rotate(-38 21.8 18.6)" />
        <ellipse cx="16" cy="17.4" rx="3.3" ry="7.6" />
        <circle cx="16" cy="8.4" r="3.1" />
      </g>
    </svg>
  );
}
