// Fails when a hex, rgb(), or hsl() colour literal appears outside the theme files, so dark mode stays a token swap
// (roadmap 11, "Theme tokens and dark mode"). Run with `npm run check:colors`.
// Documented exceptions: business identity colours (a business's own colour is data, not theme) and the data-URI
// favicon in index.html, which is outside src and not scanned.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ALLOWED = [
  ['shared', 'ui', 'styles', 'themes'].join(sep),
  ['shared', 'account', 'demoAccounts.ts'].join(sep),
  ['app', 'account', 'accountOptions.ts'].join(sep),
];
const LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
const EXTENSIONS = ['.css', '.ts', '.tsx'];

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const problems = [];
for (const file of walk(SRC)) {
  const path = relative(SRC, file);
  if (!EXTENSIONS.some((extension) => file.endsWith(extension)) || ALLOWED.some((allowed) => path.startsWith(allowed))) {
    continue;
  }
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    // An id selector or an in-page anchor (href="#main-content") is not a colour; only flag hex-looking tokens.
    const match = line.match(LITERAL);
    if (match && !/href=["']#|#[a-z-]*[g-z][a-z-]*\b/.test(match[0])) {
      problems.push(`${path}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (problems.length > 0) {
  console.error(`Colour literals outside the theme files (use a token from shared/ui/styles/themes):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('check:colors: no colour literals outside the theme files.');
