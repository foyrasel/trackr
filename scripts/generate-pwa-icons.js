/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Generates PWA icon files (192x192 and 512x512) for Trackr.
 * Creates a green circle with a white "T" letter on a transparent background.
 * Run: bun scripts/generate-pwa-icons.js
 */

const sharp = require('sharp');
const path = require('path');

const SIZES = [192, 512];
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

async function generateIcon(size) {
  const padding = Math.round(size * 0.1);
  const circleRadius = Math.round((size - padding * 2) / 2);
  const centerX = size / 2;
  const centerY = size / 2;

  // Build SVG with green circle and white "T"
  const fontSize = Math.round(size * 0.55);
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}" fill="url(#bg)" />
      <text
        x="${centerX}"
        y="${centerY}"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="Arial, Helvetica, sans-serif"
        font-weight="bold"
        font-size="${fontSize}"
        fill="white"
      >T</text>
    </svg>
  `;

  const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`✅ Generated ${outputPath} (${size}x${size})`);
}

async function main() {
  // Ensure output directory exists
  const fs = require('fs');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const size of SIZES) {
    await generateIcon(size);
  }

  console.log('\n🎉 All PWA icons generated successfully!');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
