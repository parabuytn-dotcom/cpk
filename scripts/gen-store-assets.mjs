import sharp from "sharp";

const BRAND_500 = "#6366f1";
const BRAND_700 = "#4338ca";

// 512x512 Play Store listing icon (exact size Google requires).
await sharp("resources/icon.png").resize(512, 512).png().toFile("resources/playstore-icon-512.png");

// 1024x500 feature graphic for the Play Store listing.
const feature = `
<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BRAND_500}"/>
      <stop offset="100%" stop-color="${BRAND_700}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#g)"/>
  <circle cx="180" cy="250" r="120" fill="rgba(255,255,255,0.12)"/>
  <text x="330" y="235" font-family="Arial, Helvetica, sans-serif" font-weight="800"
        font-size="90" fill="white">CPK Learn</text>
  <text x="330" y="295" font-family="Arial, Helvetica, sans-serif" font-weight="400"
        font-size="34" fill="rgba(255,255,255,0.85)">Collège Pilote du Kef</text>
</svg>`;

await sharp(Buffer.from(feature)).png().toFile("resources/playstore-feature-graphic.png");

console.log("Store assets generated.");
