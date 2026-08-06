import { z } from "zod";
import { MOCK_PAYMENTS_IN_PRODUCTION_MESSAGE } from "@/lib/payments/mockGate";

/**
 * Central env schema. Optional integrations stay optional at parse time;
 * use `requireEnv` at the call site for a loud, descriptive failure instead
 * of `process.env.X!` non-null assertions.
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
