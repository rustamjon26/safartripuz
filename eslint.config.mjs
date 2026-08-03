import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
      "lib/getCommissionRates.ts",
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
          message: "Hardcoded 0.15 float commission banned — use calcCommissionTiyin.",
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
