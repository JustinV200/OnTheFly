// Checks WCAG contrast for the colour-role pairs the components actually use, in both themes.
// Text pairs need 4.5:1; control borders and focus rings need 3:1. Run with `npm run check:contrast`.
import { readFileSync } from 'node:fs';

const THEMES = ['light', 'dark'];
// [foreground, background, minimum ratio]
const PAIRS = [
  ['text', 'canvas', 4.5], ['text', 'surface', 4.5], ['text-secondary', 'surface', 4.5],
  ['text-muted', 'canvas', 4.5], ['text-muted', 'surface', 4.5], ['text-muted', 'surface-subtle', 4.5],
  ['text-muted', 'surface-raised', 4.5], ['text-link', 'surface', 4.5], ['text-link', 'canvas', 4.5],
  ['on-brand', 'brand', 4.5], ['on-brand', 'brand-hover', 4.5], ['brand-text', 'brand-soft', 4.5],
  ['success-text', 'success-bg', 4.5], ['warning-text', 'warning-bg', 4.5], ['danger-text', 'danger-bg', 4.5],
  ['info-text', 'info-bg', 4.5], ['simulated-text', 'simulated-bg', 4.5], ['private-text', 'private-bg', 4.5],
  ['neutral-text', 'neutral-bg', 4.5], ['flybrain-text', 'flybrain-bg', 4.5], ['text-inverse', 'danger-solid', 4.5],
  ['success-text', 'surface', 4.5], ['danger-text', 'surface', 4.5], ['text', 'surface-selected', 4.5],
  ['border-control', 'surface', 3], ['focus-ring', 'surface', 3], ['focus-ring', 'canvas', 3], ['brand', 'surface', 3],
];

function readRoles(theme) {
  const css = readFileSync(new URL(`../src/shared/ui/styles/themes/${theme}.css`, import.meta.url), 'utf8');
  const roles = {};
  for (const [, name, value] of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    roles[name] = value;
  }
  return roles;
}

function luminance(hex) {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const light = readRoles('light');
let failures = 0;
for (const theme of THEMES) {
  // Dark overrides only what it redefines; anything it doesn't mention falls back to the light value.
  const roles = theme === 'light' ? light : { ...light, ...readRoles(theme) };
  for (const [foreground, background, minimum] of PAIRS) {
    if (!roles[foreground] || !roles[background]) {
      console.error(`${theme}: missing role --color-${!roles[foreground] ? foreground : background}`);
      failures += 1;
      continue;
    }
    const value = ratio(roles[foreground], roles[background]);
    if (value < minimum) {
      console.error(`${theme}: ${foreground} on ${background} is ${value.toFixed(2)}:1, needs ${minimum}:1`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  process.exit(1);
}
console.log(`check:contrast: ${PAIRS.length} pairs pass in ${THEMES.join(' and ')}.`);
