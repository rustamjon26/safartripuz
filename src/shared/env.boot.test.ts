import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertSafeRuntimeEnv, collectBootEnvIssues } from "./env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GOOD_DEV = {
  NODE_ENV: "development",
  DATABASE_URL: "mysql://safar:safar@127.0.0.1:3306/safartrip",
  JWT_ACCESS_SECRET: "dev_access_secret_change_me_use_32plus",
  JWT_REFRESH_SECRET: "dev_refresh_secret_change_me_use_32plus",
  ENCRYPTION_KEY: "0".repeat(64),
  PAYME_MERCHANT_ID: "merchant",
  PAYME_SECRET_KEY: "secret",
  CLICK_MERCHANT_ID: "click",
  CRON_SECRET: "cron",
};

const GOOD_PROD = {
  ...GOOD_DEV,
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://safartrip.uz",
};

function fatalVars(source: Record<string, string | undefined>): string[] {
  return collectBootEnvIssues(source).fatal.map((i) => i.variable);
}

function warningVars(source: Record<string, string | undefined>): string[] {
  return collectBootEnvIssues(source).warnings.map((i) => i.variable);
}

function envOf(nodeEnv?: string, flag?: string): NodeJS.ProcessEnv {
  return {
    ...(nodeEnv !== undefined ? { NODE_ENV: nodeEnv } : {}),
    ...(flag !== undefined ? { PAYMENTS_MOCK_ENABLED: flag } : {}),
  } as NodeJS.ProcessEnv;
}

describe("assertSafeRuntimeEnv", () => {
  it("refuses to start production with mock payments enabled", () => {
    expect(() => assertSafeRuntimeEnv(envOf("production", "true"))).toThrow(
      /Refusing to start/,
    );
    expect(() => assertSafeRuntimeEnv(envOf("production", "true"))).toThrow(
      /PAYMENTS_MOCK_ENABLED/,
    );
  });

  it("allows production without the flag", () => {
    expect(() => assertSafeRuntimeEnv(envOf("production"))).not.toThrow();
    expect(() =>
      assertSafeRuntimeEnv(envOf("production", "false")),
    ).not.toThrow();
  });

  it("allows the flag outside production", () => {
    expect(() => assertSafeRuntimeEnv(envOf("development", "true"))).not.toThrow();
    expect(() => assertSafeRuntimeEnv(envOf("test", "true"))).not.toThrow();
  });
});

describe("collectBootEnvIssues", () => {
  it("accepts a complete dev and prod env", () => {
    expect(collectBootEnvIssues(GOOD_DEV)).toEqual({ fatal: [], warnings: [] });
    expect(collectBootEnvIssues(GOOD_PROD)).toEqual({ fatal: [], warnings: [] });
  });

  it("names each missing core variable rather than failing on the first", () => {
    const issues = collectBootEnvIssues({ NODE_ENV: "production" });
    expect(issues.fatal.map((i) => i.variable)).toEqual(
      expect.arrayContaining([
        "DATABASE_URL",
        "JWT_ACCESS_SECRET",
        "JWT_REFRESH_SECRET",
        "NEXT_PUBLIC_APP_URL",
      ]),
    );
  });

  it("rejects a DATABASE_URL that is not MySQL", () => {
    expect(fatalVars({ ...GOOD_DEV, DATABASE_URL: "postgres://x/y" })).toContain(
      "DATABASE_URL",
    );
  });

  it("rejects short and reused JWT secrets in production", () => {
    expect(
      fatalVars({ ...GOOD_PROD, JWT_ACCESS_SECRET: "short" }),
    ).toContain("JWT_ACCESS_SECRET");
    expect(
      fatalVars({
        ...GOOD_PROD,
        JWT_REFRESH_SECRET: GOOD_PROD.JWT_ACCESS_SECRET,
      }),
    ).toContain("JWT_REFRESH_SECRET");
  });

  it("refuses to boot production with mock payments enabled", () => {
    const issues = collectBootEnvIssues({
      ...GOOD_PROD,
      PAYMENTS_MOCK_ENABLED: "true",
    });
    expect(issues.fatal.map((i) => i.variable)).toContain("PAYMENTS_MOCK_ENABLED");

    // Same flag is fine outside production.
    expect(
      fatalVars({ ...GOOD_DEV, PAYMENTS_MOCK_ENABLED: "true" }),
    ).not.toContain("PAYMENTS_MOCK_ENABLED");
  });

  it("rejects a malformed ENCRYPTION_KEY but only warns when absent", () => {
    expect(fatalVars({ ...GOOD_PROD, ENCRYPTION_KEY: "abc" })).toContain(
      "ENCRYPTION_KEY",
    );

    const missing = { ...GOOD_PROD, ENCRYPTION_KEY: undefined };
    expect(fatalVars(missing)).not.toContain("ENCRYPTION_KEY");
    expect(warningVars(missing)).toContain("ENCRYPTION_KEY");
  });

  it("keeps payment integration gaps as warnings by default", () => {
    const source = {
      ...GOOD_PROD,
      PAYME_MERCHANT_ID: undefined,
      PAYME_SECRET_KEY: undefined,
      CLICK_MERCHANT_ID: undefined,
      CRON_SECRET: undefined,
    };
    expect(collectBootEnvIssues(source).fatal).toEqual([]);
    expect(warningVars(source)).toEqual(
      expect.arrayContaining([
        "PAYME_MERCHANT_ID",
        "PAYME_SECRET_KEY",
        "CLICK_MERCHANT_ID",
        "CRON_SECRET",
      ]),
    );

    expect(
      fatalVars({ ...source, ENV_STRICT_INTEGRATIONS: "1" }),
    ).toEqual(
      expect.arrayContaining(["PAYME_MERCHANT_ID", "CLICK_MERCHANT_ID"]),
    );
  });

  it("asks for the test secret when Payme runs in test mode", () => {
    const source = {
      ...GOOD_PROD,
      PAYME_IS_TEST: "true",
      PAYME_SECRET_KEY: undefined,
    };
    expect(warningVars(source)).toContain("PAYME_TEST_SECRET_KEY");
  });
});

describe("worker bootstrap", () => {
  it("exits immediately, naming the missing variable, instead of half-starting", () => {
    const repoRoot = path.resolve(__dirname, "../..");
    // Run from an empty cwd so no stray .env supplies what the test withholds.
    const scratch = mkdtempSync(path.join(tmpdir(), "safar-boot-"));

    let stderr = "";
    let status = 0;
    try {
      execFileSync(
        path.join(repoRoot, "node_modules/.bin/tsx"),
        [path.join(repoRoot, "scripts/outbox-relay.ts")],
        {
          cwd: scratch,
          timeout: 120_000,
          encoding: "utf8",
          env: {
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            NODE_ENV: "production",
            JWT_ACCESS_SECRET: "x".repeat(40),
            JWT_REFRESH_SECRET: "y".repeat(40),
            NEXT_PUBLIC_APP_URL: "https://safartrip.uz",
          },
        },
      );
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      status = e.status ?? -1;
      stderr = e.stderr ?? "";
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }

    expect(status).toBe(1);
    expect(stderr).toContain("refusing to start");
    expect(stderr).toContain("DATABASE_URL");
    expect(stderr).not.toContain("[outbox-relay] starting");
  }, 180_000);
});
