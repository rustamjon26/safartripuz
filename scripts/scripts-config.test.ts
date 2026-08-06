/**
 * Ops scripts drift silently: nothing runs setup-server.sh in CI, and backup.sh
 * only runs on the VPS at 02:15. These assert the parts that must agree with
 * production.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relative: string): string {
  return readFileSync(path.join(repoRoot, relative), "utf8");
}

describe("setup-server.sh matches production", () => {
  const setup = read("scripts/setup-server.sh");

  it("installs the Node major the app actually runs on", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(setup).toContain("setup_22.x");
    expect(setup).not.toContain("setup_20.x");
    expect(ci).toContain('node-version: "22"');
  });

  it("uses the same app directory as the deploy script and PM2", () => {
    expect(read("scripts/deploy-safe.sh")).toContain("/var/www/safar\n");
    // Root deploys must re-exec as safartrip — dual PM2 (~/.pm2) causes EADDRINUSE.
    expect(read("scripts/deploy-safe.sh")).toMatch(/Re-executing deploy as/);
    expect(read("scripts/deploy-safe.sh")).toMatch(/DEPLOY_AS_USER/);
    expect(read("ecosystem.config.js")).toContain('cwd: "/var/www/safar"');
    expect(setup).toContain("/var/www/safar");
    // The bootstrap script used to create /var/www/safartrip, which nothing else knew about.
    expect(setup).not.toMatch(/\/var\/www\/safartrip\b/);
  });

  it("keeps the nginx static alias narrow enough for /_next/image to reach the app", () => {
    expect(setup).toContain("location /_next/static/");
    expect(setup).not.toMatch(/location \/_next\/\s*\{/);
  });
});

describe("backup.sh off-site copy", () => {
  const backup = read("scripts/backup.sh");

  it("no longer evals the operator's command in this shell", () => {
    expect(backup).not.toMatch(/^\s*eval /m);
  });

  it("prefers a script invoked with argv", () => {
    expect(backup).toContain('"$BACKUP_OFFSITE_SCRIPT" "$OUT_DAILY" "$OUT_META"');
  });

  it("still supports the legacy command, but in a child shell", () => {
    expect(backup).toContain(
      'bash -c "$BACKUP_OFFSITE_CMD" backup-offsite "$OUT_DAILY" "$OUT_META"',
    );
  });

  it("keeps the off-site copy mandatory", () => {
    expect(backup).toContain('if [[ -z "${BACKUP_OFFSITE_SCRIPT:-}" && -z "${BACKUP_OFFSITE_CMD:-}" ]]');
    expect(backup).toContain("exit 1");
  });
});

describe("ChannelSyncJob", () => {
  it("is recorded as not implemented, so the table is not mistaken for a queue", () => {
    const backlog = read("docs/BACKLOG.md");
    expect(backlog).toContain("Channel / OTA sync — NOT IMPLEMENTED");
    expect(backlog).toContain("ChannelSyncJob");
  });

  it("really has no worker draining it", () => {
    // If this fails, a worker was added — update the backlog entry.
    const pm2 = read("ecosystem.config.js");
    expect(pm2).not.toContain("channel");
  });
});
