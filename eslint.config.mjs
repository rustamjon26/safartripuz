import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { PRISMA_ROUTE_DEBT } from "./eslint.prisma-route-debt.mjs";

/**
 * Restricted-import path groups.
 *
 * NOTE: ESLint flat config does NOT merge options for the same rule — the last
 * matching config object fully replaces earlier ones. So every file must be
 * covered by exactly ONE `no-restricted-imports` block (zones below are kept
 * disjoint via `ignores`), and each block lists the full union of paths it needs.
 */
const prismaPaths = [
  {
    name: "@/lib/prisma",
    message: "Prisma only inside repository layer (src/modules/*/repository).",
  },
  {
    name: "@/src/shared/db/prisma",
    message: "Prisma only inside repository layer (src/modules/*/repository).",
  },
];

const prismaDebtPaths = [
  {
    name: "@/lib/prisma",
    message:
      "Migration debt: move this Prisma access into a module repository (src/modules/*/repository).",
  },
  {
    name: "@/src/shared/db/prisma",
    message:
      "Migration debt: move this Prisma access into a module repository (src/modules/*/repository).",
  },
];

/**
 * Route handlers are the layer that must never reach the database itself:
 * route → service → repository → prisma. Anything the route needs belongs
 * behind a module's index.ts.
 */
const prismaRoutePaths = [
  {
    name: "@/lib/prisma",
    message:
      "Route handlers must not import Prisma. Call a module service (src/modules/*/index.ts); the repository layer owns the query.",
  },
  {
    name: "@/src/shared/db/prisma",
    message:
      "Route handlers must not import Prisma. Call a module service (src/modules/*/index.ts); the repository layer owns the query.",
  },
];

/**
 * `ignores` entries are globs, so a dynamic segment like `[id]` would be read
 * as a character class and match nothing. The debt list stays as real paths.
 */
const escapeGlob = (p) => p.replace(/[[\]]/g, (c) => `\\${c}`);

const somTiyinPaths = [
  {
    name: "@/src/shared/money",
    importNames: ["somToTiyin", "tiyinToSom"],
    message:
      "somToTiyin/tiyinToSom only from payment adapters (or rates quote bridge).",
  },
  {
    name: "@/shared/money",
    importNames: ["somToTiyin", "tiyinToSom"],
    message:
      "somToTiyin/tiyinToSom only from payment adapters (or rates quote bridge).",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Production deploy copies of the standalone build (linting these OOMs / hangs on 8 GB).
    "standalone/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "safartrip-customer/**",
    "taxi-driver/**",
    "apps/**",
  ]),

  /**
   * Rules retuned so `npm run lint` can be a blocking CI gate again (it was
   * dropped 2026-07-29 in 5f5de3a). Each entry below is a deliberate call, not
   * a mute — see the individual notes.
   */
  {
    rules: {
      /**
       * The UI is written in Uzbek, where the apostrophe is a letter
       * ("Ro'yxatdan o'ting"). Escaping ~84 of them to `&apos;` makes the
       * source unreadable for no rendering benefit. Keep the part of the rule
       * that catches real mistakes: a stray `>` or `}` from a broken tag.
       */
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],

      /**
       * React Compiler rules, currently 12 hits across layouts and fetch-on-
       * mount pages (drawer-close-on-navigate, `setMounted(true)` for
       * hydration, `setLoading(true)` inside a loader called from an effect).
       * Fixing them properly means restructuring data fetching in each
       * component, which does not belong in an ops change — tracked as warnings
       * so the count is visible and should only go down.
       */
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },

  /** Standalone Node scripts are CommonJS and run straight through `node`. */
  {
    files: ["scripts/**/*.js", "scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  /**
   * Zone A — payment adapters + rates service (the som↔tiyin conversion
   * boundary). Prisma still restricted (not a repository); som/tiyin allowed.
   */
  {
    files: [
      "src/modules/payment/adapters/**/*.{ts,tsx}",
      "src/modules/rates/service/**/*.{ts,tsx}",
    ],
    ignores: ["**/*.test.ts", "**/*.integration.test.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: prismaPaths }],
    },
  },

  /**
   * Zone B — money-critical module code (services/domain). Prisma only in the
   * repository layer; som↔tiyin conversion only in adapters/rates (Zone A).
   * Repository, adapters, rates, tests are excluded (governed elsewhere / free).
   */
  {
    files: ["src/modules/**/*.{ts,tsx}", "lib/payments/**/*.{ts,tsx}"],
    ignores: [
      "src/modules/*/repository/**",
      "src/modules/**/*.test.ts",
      "src/modules/**/*.integration.test.ts",
      "src/modules/payment/adapters/**",
      "src/modules/rates/service/**",
      "src/modules/rates/repository/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [...prismaPaths, ...somTiyinPaths] },
      ],
    },
  },

  /**
   * Zone C — legacy routes/libs (migration debt gauge, strangler pattern).
   * Prisma access is WARN so it never blocks CI, but every warning is one file
   * that still owes a move into a module repository. Each PR should lower this
   * count, never raise it. som↔tiyin misuse also warns here.
   */
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: [
      "lib/payments/**",
      "lib/prisma.ts",
      "**/*.test.ts",
      "**/*.integration.test.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "warn",
        { paths: [...prismaDebtPaths, ...somTiyinPaths] },
      ],
    },
  },

  /**
   * Zone D — API route handlers. Prisma here is an ERROR, not debt.
   *
   * Deliberately placed after Zone C: flat config replaces (never merges) a
   * rule's options, so for the files matched here this block supersedes Zone C's
   * warn. It therefore has to restate somTiyinPaths, or those files would lose
   * that check entirely.
   *
   * PRISMA_ROUTE_DEBT is the ~149-file baseline that predates this rule; those
   * stay on Zone C's warn via the `ignores` below until each module's routes are
   * moved onto a repository. See eslint.prisma-route-debt.mjs.
   */
  {
    files: ["app/api/**/route.ts"],
    ignores: [
      ...PRISMA_ROUTE_DEBT.map(escapeGlob),
      "**/*.test.ts",
      "**/*.integration.test.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [...prismaRoutePaths, ...somTiyinPaths] },
      ],
    },
  },

  /**
   * Float money ban on money-critical paths (tiyin BigInt only).
   * Uses a different rule (no-restricted-syntax) so it does not conflict with
   * the no-restricted-imports zones above.
   */
  {
    files: [
      "src/modules/ledger/**/*.{ts,tsx}",
      "src/modules/booking/**/*.{ts,tsx}",
      "src/modules/payment/**/*.{ts,tsx}",
      "src/modules/commission/**/*.{ts,tsx}",
      "lib/payments/**/*.{ts,tsx}",
      "app/api/taxi/driver/orders/**/*.{ts,tsx}",
    ],
    ignores: ["**/*.test.ts", "**/*.integration.test.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='toFixed']",
          message: "Float money banned — use tiyin BigInt / Money (no toFixed).",
        },
        {
          selector: "BinaryExpression[operator='*'] > Literal[value=0.15]",
          message:
            "Hardcoded 0.15 float commission banned — use calcPlatformCommissionTiyin.",
        },
        {
          selector: "BinaryExpression[operator='*'] > Literal[raw=/^0\\.\\d+$/]",
          message: "Float literal money math banned — use tiyin BigInt.",
        },
      ],
    },
  },
]);

export default eslintConfig;
