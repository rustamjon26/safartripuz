import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "safartrip-customer/**",
    "taxi-driver/**",
    "apps/**",
  ]),

  /**
   * Money-critical modules: Prisma only in repository / shared db.
   * Scoped to src/modules + lib/payments so the rest of the legacy app can migrate later.
   * See ARCHITECTURE.md “1.1 remaining modules”.
   */
  {
    files: ["src/modules/**/*.{ts,tsx}", "lib/payments/**/*.{ts,tsx}"],
    ignores: [
      "src/modules/*/repository/**",
      "src/shared/db/**",
      "src/modules/**/*.test.ts",
      "src/modules/**/*.integration.test.ts",
      "src/test/**",
      "scripts/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/prisma",
              message: "Prisma only inside repository layer (src/modules/*/repository).",
            },
            {
              name: "@/src/shared/db/prisma",
              message: "Prisma only inside repository layer (src/modules/*/repository).",
            },
            // @prisma/client types still allowed in services; runtime client must go through repository.
          ],
        },
      ],
    },
  },

  /**
   * Som↔tiyin conversion helpers: payment adapters only (+ rates quote bridge allowlisted).
   */
  {
    files: ["src/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    ignores: [
      "src/modules/payment/adapters/**",
      "src/modules/rates/service/**",
      "src/modules/rates/repository/**",
      "src/shared/money.ts",
      "src/shared/money.test.ts",
      "scripts/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
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
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
