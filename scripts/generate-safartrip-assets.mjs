/**
 * Generates app icon, Android adaptive foreground, and splash logo for
 * SafarTrip Expo apps (taxi-driver + safartrip-customer).
 * Run from repo root: node scripts/generate-safartrip-assets.mjs
 * Requires: sharp (devDependency in taxi-driver)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Material "flight" icon path (24x24 viewBox) — map/plane mark
const FLIGHT_PATH =
  "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z";

const BRAND = "#1F4E79";

const targets = [path.join(root, "taxi-driver", "assets"), path.join(root, "safartrip-customer", "assets")];

/** 1024x1024 app icon: solid brand background, white mark — fully opaque (no alpha channel) */
async function makeIconPng() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" fill="${BRAND}"/>
  <path fill="#FFFFFF" d="${FLIGHT_PATH}"/>
</svg>`;
  return sharp(Buffer.from(svg))
    .flatten({ background: BRAND })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * 1024x1024 adaptive foreground: transparent background, white icon in ~66% safe zone
 * (scales the 24x24 path to width ~0.66 * 1024)
 */
async function makeAdaptivePng() {
  const size = 1024;
  const content = size * 0.66;
  const scale = content / 24;
  const offset = (size - content) / 2;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path fill="#FFFFFF" d="${FLIGHT_PATH}"/>
  </g>
</svg>`;
  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

/** 200x200 splash: white icon on transparent */
async function makeSplashPng() {
  const size = 200;
  const pad = 0.12 * size;
  const content = size - 2 * pad;
  const scale = content / 24;
  const offset = (size - 24 * scale) / 2;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path fill="#FFFFFF" d="${FLIGHT_PATH}"/>
  </g>
</svg>`;
  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

/** 48x48 web favicon (Expo web) */
async function makeFaviconPng() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" rx="4" fill="${BRAND}"/>
  <path fill="#FFFFFF" d="${FLIGHT_PATH}"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const [icon, adaptive, splash, favicon] = await Promise.all([
    makeIconPng(),
    makeAdaptivePng(),
    makeSplashPng(),
    makeFaviconPng(),
  ]);

  for (const dir of targets) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(path.join(dir, "icon.png"), icon);
    await fs.promises.writeFile(path.join(dir, "adaptive-icon.png"), adaptive);
    await fs.promises.writeFile(path.join(dir, "splash-icon.png"), splash);
    await fs.promises.writeFile(path.join(dir, "favicon.png"), favicon);
    // eslint-disable-next-line no-console
    console.log("Wrote:", dir);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
