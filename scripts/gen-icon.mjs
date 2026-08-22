import sharp from "sharp";

const SIZE = 1024;
const BRAND_500 = "#6366f1";
const BRAND_700 = "#4338ca";

const background = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BRAND_500}"/>
      <stop offset="100%" stop-color="${BRAND_700}"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
</svg>`;

const foregroundText = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="800"
        font-size="300" fill="white" letter-spacing="4">CPK</text>
</svg>`;

await sharp(Buffer.from(background))
  .composite([{ input: Buffer.from(foregroundText) }])
  .png()
  .toFile("resources/icon.png");

await sharp(Buffer.from(background)).png().toFile("resources/icon-background.png");

await sharp(Buffer.from(foregroundText)).png().toFile("resources/icon-foreground.png");

console.log("Icons generated.");
