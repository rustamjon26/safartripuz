/**
 * Hotel panel pages must go through hotelFetch.
 *
 * A raw fetch to an internal API silently fails once the 15-minute access token
 * expires: the page gets a 401, shows nothing useful, and the tab looks broken
 * until a manual reload. hotelFetch refreshes and retries instead.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const hotelDir = path.dirname(fileURLToPath(import.meta.url));

/** hotelFetch retries through these, so they must stay raw. */
const ALLOWED_RAW = ["/api/auth/refresh", "/api/auth/logout"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}

describe("hotel panel fetch usage", () => {
  it("has no raw fetch() to an internal API", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(hotelDir)) {
      if (file.endsWith(path.join("_lib", "hotelFetch.ts"))) continue;
      const source = readFileSync(file, "utf8");

      source.split("\n").forEach((line, i) => {
        // `hotelFetch(` also matches /\bfetch\(/ — exclude it explicitly.
        const raw = /(?<!hotel)(?<![A-Za-z])fetch\(/.exec(line);
        if (!raw) return;
        if (ALLOWED_RAW.some((url) => line.includes(url))) return;
        offenders.push(`${path.relative(hotelDir, file)}:${i + 1} ${line.trim()}`);
      });
    }

    expect(offenders).toEqual([]);
  });

  it("imports hotelFetch wherever it calls an internal API", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(hotelDir)) {
      if (file.endsWith(path.join("_lib", "hotelFetch.ts"))) continue;
      const source = readFileSync(file, "utf8");
      if (!source.includes("hotelFetch(")) continue;
      if (!/from "@\/app\/hotel\/_lib\/hotelFetch"/.test(source)) {
        offenders.push(path.relative(hotelDir, file));
      }
    }

    expect(offenders).toEqual([]);
  });
});
