/**
 * Four UX fixes that a browser check would not catch reliably: a flicker on a
 * 10-second timer, a request per keystroke, a missing manifest link, and an
 * image flag.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relative: string): string {
  return readFileSync(path.join(repoRoot, relative), "utf8");
}

describe("taxi order tracking", () => {
  const source = read("app/taxi/orders/[id]/page.tsx");

  it("polls in the background instead of flipping back to the skeleton", () => {
    expect(source).toContain("load({ background: true })");
    expect(source).toContain("if (!opts.background) setLoading(true)");
    expect(source).toContain("if (!opts.background) setLoading(false)");
  });

  it("keeps the last known order when a poll fails", () => {
    const start = source.indexOf("async function load");
    const loader = source.slice(start, source.indexOf("useEffect(() => {", start));
    expect(loader).toContain("catch {");
    expect(loader).not.toContain("setOrder(null)");
  });

  it("still shows the skeleton on the very first load", () => {
    expect(source).toContain("useState(true)");
    expect(source).toMatch(/if \(loading \|\| !order\)/);
  });
});

describe("support feed search", () => {
  const source = read("app/support/feed/page.tsx");

  it("waits for a typing pause rather than firing per character", () => {
    expect(source).toMatch(/const SEARCH_DEBOUNCE_MS = 300;/);
    expect(source).toContain("setTimeout(() => void load(controller.signal), SEARCH_DEBOUNCE_MS)");
  });

  it("aborts the in-flight request when a newer one starts", () => {
    expect(source).toContain("new AbortController()");
    expect(source).toContain("controller.abort()");
    expect(source).toContain("signal,");
  });

  it("does not report an aborted request as a failure", () => {
    expect(source).toContain('e.name === "AbortError"');
  });

  it("clears the debounce timer on unmount", () => {
    expect(source).toContain("clearTimeout(timer)");
  });
});

describe("PWA manifest", () => {
  const layout = read("app/layout.tsx");

  it("links the manifest that public/ already ships", () => {
    expect(layout).toContain('manifest: "/manifest.json"');
  });

  it("declares a theme colour via the viewport export", () => {
    expect(layout).toContain("export const viewport: Viewport");
    expect(layout).toContain("themeColor:");
  });

  it("the manifest itself is installable", () => {
    const manifest = JSON.parse(read("public/manifest.json"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBeTruthy();
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });
});

describe("next/image", () => {
  const config = read("next.config.js");

  it("optimizes by default", () => {
    expect(config).toContain(
      'unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "true"',
    );
    expect(config).not.toContain("unoptimized: true");
  });

  it("documents the rollback rather than leaving it to memory", () => {
    expect(config).toContain("NEXT_IMAGE_UNOPTIMIZED=true");
    expect(read("docs/DEPLOY.md")).toContain("NEXT_IMAGE_UNOPTIMIZED=true");
  });

  it("keeps sharp a direct dependency, since the built-in loader needs it", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.dependencies.sharp).toBeTruthy();
  });
});
