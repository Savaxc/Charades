import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Rasterizes the brand SVGs in `assets/brand` into the PNG files Expo expects.
 * Uses macOS `sips`, so run it on a Mac (`npm run icons`).
 */
const BRAND_DIR = path.resolve('assets/brand');
const ASSETS_DIR = path.resolve('assets');

if (process.platform !== 'darwin') {
  console.error('generate-icons requires macOS (uses sips).');
  process.exit(1);
}

const targets = [
  ['icon.svg', 'icon.png'],
  ['splash.svg', 'splash-icon.png'],
  ['adaptive-background.svg', 'android-icon-background.png'],
  ['adaptive-foreground.svg', 'android-icon-foreground.png'],
  ['adaptive-monochrome.svg', 'android-icon-monochrome.png'],
];

for (const [source, target] of targets) {
  const input = path.join(BRAND_DIR, source);
  const output = path.join(ASSETS_DIR, target);

  if (!fs.existsSync(input)) {
    throw new Error(`Missing brand source: ${input}`);
  }

  execFileSync('sips', ['-s', 'format', 'png', input, '--out', output], {
    stdio: 'ignore',
  });
  console.log(`✓ ${target}`);
}

execFileSync(
  'sips',
  ['-z', '196', '196', path.join(ASSETS_DIR, 'icon.png'), '--out', path.join(ASSETS_DIR, 'favicon.png')],
  { stdio: 'ignore' },
);
console.log('✓ favicon.png');
