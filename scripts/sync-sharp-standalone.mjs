/**
 * Copies @img/sharp-win32-x64 native binaries (libvips DLLs + .node) into
 * .next/standalone so dlopen can resolve dependencies. Run after `next build`.
 * Windows only; no-op on other platforms.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

if (process.platform !== "win32") {
  console.log("sync-sharp-standalone: skipped (not win32)");
  process.exit(0);
}

const srcLib = path.join(root, "node_modules", "@img", "sharp-win32-x64", "lib");
const candidates = [
  path.join(
    root,
    ".next",
    "standalone",
    "node_modules",
    "next",
    "node_modules",
    "@img",
    "sharp-win32-x64",
    "lib"
  ),
  path.join(
    root,
    ".next",
    "standalone",
    "node_modules",
    "@img",
    "sharp-win32-x64",
    "lib"
  ),
];

if (!fs.existsSync(srcLib)) {
  console.warn(
    "sync-sharp-standalone: missing source",
    srcLib,
    "(install sharp / optional deps with npm install --include=optional)"
  );
  process.exit(0);
}

let copied = 0;
for (const destLib of candidates) {
  if (!fs.existsSync(destLib)) continue;
  for (const name of fs.readdirSync(srcLib)) {
    fs.copyFileSync(path.join(srcLib, name), path.join(destLib, name));
    copied++;
  }
  console.log("sync-sharp-standalone:", destLib);
}

if (copied === 0) {
  console.warn(
    "sync-sharp-standalone: no sharp-win32-x64 lib dirs under .next/standalone — run next build first"
  );
}
