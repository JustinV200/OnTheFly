/* Reads the brain view's colours from theme tokens, so the canvas follows light and dark mode like the rest of the app.
   WebGL can't read CSS, so this converts the token values to RGB floats; the colours themselves live in the theme files. */

export interface BrainColors {
  neuron: [number, number, number];
  spike: [number, number, number];
  input: [number, number, number];
}

/** Read --color-brain-* from element's computed style; throws if a token is missing or not a 6-digit hex value. */
export function readBrainColors(element: Element): BrainColors {
  const style = getComputedStyle(element);
  return {
    neuron: tokenRgb(style, '--color-brain-neuron'),
    spike: tokenRgb(style, '--color-brain-spike'),
    input: tokenRgb(style, '--color-brain-input'),
  };
}

function tokenRgb(style: CSSStyleDeclaration, token: string): [number, number, number] {
  const value = style.getPropertyValue(token).trim();
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (match === null) {
    // A missing token would otherwise draw black on black and look like the simulation is silent.
    throw new Error(`Theme token ${token} must be a 6-digit hex colour, got "${value}"`);
  }
  return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255];
}
