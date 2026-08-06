import { z } from "zod";
import { MOCK_PAYMENTS_IN_PRODUCTION_MESSAGE } from "@/lib/payments/mockGate";

/**
 * Central env schema. Optional integrations stay optional at parse time;
 * use `requireEnv` at the call site for a loud, descriptive failure instead
 * of `process.env.X!` non-null assertions.
 *
 * Everything here stays optional on purpose: this module is imported during
 * `next build`, which runs without production secrets. Boot-time requirements
 * live in `collectBootEnvIssues` / `assertBootEnvOrExit`, which only the actual
 * server and worker entry points call.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Didox EDO
  DIDOX_PARTNER_TOKEN: z.string().min(1).optional(),
  DIDOX_TAX_ID: z.string().min(1).optional(),
  DIDOX_PASSWORD: z.string().min(1).optional(),
  DIDOX_DEFAULT_BUYER_TIN: z.string().min(1).optional(),
  DIDOX_SELLER_NAME: z.string().min(1).optional(),
  DIDOX_SELLER_ADDRESS: z.string().min(1).optional(),
  DIDOX_SELLER_BANK_ACCOUNT: z.string().min(1).optional(),
  DIDOX_SELLER_BANK_ID: z.string().min(1).optional(),
  DIDOX_CATALOG_CODE: z.string().min(1).optional(),
  DIDOX_ENVIRONMENT: z.string().min(1).optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  // AI
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  // Payments
  PAYMENTS_MOCK_ENABLED: z.enum(["true", "false"]).optional(),

  // Ops
  CRON_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().min(1).optional(),
  APP_URL: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Combinations that are individually valid but unsafe together. Called at boot
 * from `instrumentation.ts` and again below, so importing this module anywhere
 * fails loudly rather than letting the process run misconfigured.
 */
export function assertSafeRuntimeEnv(
  source: NodeJS.ProcessEnv = process.env,
): void {
  if (
    source.NODE_ENV === "production" &&
    source.PAYMENTS_MOCK_ENABLED === "true"
  ) {
    throw new Error(
      `Refusing to start: ${MOCK_PAYMENTS_IN_PRODUCTION_MESSAGE}`,
    );
  }
}

/** Parsed once per process; throws early on malformed values. */
export const env: Env = envSchema.parse(process.env);

assertSafeRuntimeEnv();

/** Loud accessor for env vars that are required by the current code path. */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (value == null || value === "") {
    throw new Error(
      `Missing required environment variable: ${String(key)} — set it in .env / server secrets`,
    );
  }
  return value as NonNullable<Env[K]>;
}

// ---------------------------------------------------------------------------
// Boot validation
// ---------------------------------------------------------------------------

export type EnvIssue = {
  variable: string;
  problem: string;
};

export type BootEnvReport = {
  /** The process must not start. */
  fatal: EnvIssue[];
  /** The process starts, but the named integration is dead until fixed. */
  warnings: EnvIssue[];
};

type EnvSource = Record<string, string | undefined>;

const HEX_64 = /^[0-9a-f]{64}$/i;
const MIN_PROD_SECRET_LENGTH = 32;

function read(source: EnvSource, name: string): string | undefined {
  const value = source[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isTruthyFlag(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * Everything the process needs before it is allowed to serve traffic.
 *
 * Fatal means the process cannot serve anything correctly or safely. A var that
 * only disables one feature is a warning instead — Payme/Click, for instance,
 * can also be configured through the `payment_providers` system setting, so a
 * hard failure there would refuse to boot a perfectly working deployment. Set
 * ENV_STRICT_INTEGRATIONS=1 once a deployment carries them all in env to
 * promote every warning to fatal.
 *
 * Pure so it can be tested without spawning a server.
 */
export function collectBootEnvIssues(source: EnvSource = process.env): BootEnvReport {
  const fatal: EnvIssue[] = [];
  const warnings: EnvIssue[] = [];

  const isProduction = read(source, "NODE_ENV") === "production";
  const strictIntegrations = isTruthyFlag(read(source, "ENV_STRICT_INTEGRATIONS"));
  const integration = (variable: string, problem: string) =>
    (strictIntegrations ? fatal : warnings).push({ variable, problem });

  const databaseUrl = read(source, "DATABASE_URL");
  if (!databaseUrl) {
    fatal.push({ variable: "DATABASE_URL", problem: "missing" });
  } else if (!databaseUrl.startsWith("mysql://")) {
    fatal.push({
      variable: "DATABASE_URL",
      problem: "must be a mysql:// connection string",
    });
  }

  const accessSecret = read(source, "JWT_ACCESS_SECRET");
  const refreshSecret = read(source, "JWT_REFRESH_SECRET");
  for (const [variable, value] of [
    ["JWT_ACCESS_SECRET", accessSecret],
    ["JWT_REFRESH_SECRET", refreshSecret],
  ] as const) {
    if (!value) {
      fatal.push({ variable, problem: "missing" });
    } else if (isProduction && value.length < MIN_PROD_SECRET_LENGTH) {
      fatal.push({
        variable,
        problem: `must be at least ${MIN_PROD_SECRET_LENGTH} characters in production`,
      });
    }
  }
  if (accessSecret && refreshSecret && accessSecret === refreshSecret) {
    fatal.push({
      variable: "JWT_REFRESH_SECRET",
      problem:
        "must differ from JWT_ACCESS_SECRET — otherwise a refresh token is accepted as an access token",
    });
  }

  // A wrong key is always fatal; a missing one only kills reception booking
  // encryption, so it follows the integration rule below.
  const encryptionKey = read(source, "ENCRYPTION_KEY");
  if (!encryptionKey) {
    integration(
      "ENCRYPTION_KEY",
      "missing — reception bookings cannot encrypt guest document data",
    );
  } else if (!HEX_64.test(encryptionKey)) {
    fatal.push({
      variable: "ENCRYPTION_KEY",
      problem: "must be a 64-character hex string (32 bytes)",
    });
  }

  if (isProduction && !read(source, "NEXT_PUBLIC_APP_URL") && !read(source, "APP_URL")) {
    fatal.push({
      variable: "NEXT_PUBLIC_APP_URL",
      problem:
        "missing — set NEXT_PUBLIC_APP_URL (or APP_URL); payment return URLs are built from it",
    });
  }

  // Mirrors lib/payments/mockGate.ts: a PSP-less "payment succeeded" button must
  // never be reachable in production, whatever the flag says.
  if (isProduction && read(source, "PAYMENTS_MOCK_ENABLED") === "true") {
    fatal.push({
      variable: "PAYMENTS_MOCK_ENABLED",
      problem: "must not be \"true\" in production — mock payments bypass the PSP",
    });
  }

  if (!read(source, "PAYME_MERCHANT_ID")) {
    integration("PAYME_MERCHANT_ID", "missing — /api/payme merchant auth will reject Payme");
  }
  const paymeIsTest = isTruthyFlag(read(source, "PAYME_IS_TEST"));
  const paymeSecret =
    read(source, "PAYME_SECRET_KEY") ??
    (paymeIsTest ? read(source, "PAYME_TEST_SECRET_KEY") : undefined);
  if (!paymeSecret) {
    integration(
      paymeIsTest ? "PAYME_TEST_SECRET_KEY" : "PAYME_SECRET_KEY",
      "missing — Payme webhook signatures cannot be verified",
    );
  }

  if (!read(source, "CLICK_MERCHANT_ID") && !read(source, "CLICK_SERVICE_ID")) {
    integration(
      "CLICK_MERCHANT_ID",
      "missing — set CLICK_MERCHANT_ID/CLICK_SERVICE_ID or configure Click in the payment_providers setting",
    );
  }

  if (!read(source, "CRON_SECRET")) {
    integration("CRON_SECRET", "missing — /api/cron/* returns 503 until it is set");
  }

  return { fatal, warnings };
}

export function formatBootEnvIssues(issues: EnvIssue[]): string {
  return issues.map((i) => `  - ${i.variable}: ${i.problem}`).join("\n");
}

/**
 * Called from server/worker entry points only. Prints every problem at once —
 * fixing env one restart at a time is the failure mode this replaces.
 */
export function assertBootEnvOrExit(source: EnvSource = process.env): void {
  const { fatal, warnings } = collectBootEnvIssues(source);

  if (warnings.length > 0) {
    console.warn(
      `[env] ${warnings.length} integration(s) unconfigured:\n${formatBootEnvIssues(warnings)}`,
    );
  }

  if (fatal.length > 0) {
    console.error(
      `[env] refusing to start — ${fatal.length} environment problem(s):\n${formatBootEnvIssues(fatal)}`,
    );
    process.exit(1);
  }
}
