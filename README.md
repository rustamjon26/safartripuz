# Safartrip.uz

Safartrip — turizm platformasi. Loyiha ichida quyidagi modullar bor:

- HomeStay (host/guest/admin)
- Taxi (driver/customer/admin)
- Guide (partner/customer/admin)
- Travel plan va payment oqimi

Frontend va backend bir xil Next.js App Router loyihasida yuradi (`app/api/*` route handlers orqali).

## Texnologiyalar

- Next.js 16 + React 19 + TypeScript
- Prisma + MySQL
- Tailwind CSS
- Zod (validatsiya)
- Vitest (money-path unit + integration tests)

## Talablar

- Node.js 18+ (tavsiya: 20+)
- npm
- MySQL 8 (Docker optional for tests)

## O'rnatish

```bash
npm install
```

`.env` fayl yarating va kerakli o'zgaruvchilarni kiriting (kamida):

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DB_NAME"
JWT_ACCESS_SECRET="your_access_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
```

Optional observability:

```env
SENTRY_DSN=""
SENTRY_ENVIRONMENT="production"
```

Lokal Open Server MySQL uchun misol (root, parolsiz, `safartrip` bazasi):

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/safartrip"
```

## Prisma (DB) ishga tushirish

```bash
npx prisma migrate deploy
npx prisma generate
```

Legacy / local speed: `npx prisma db push` (production safe path prefers migrate — see `deploy:safe`).

## Testlar

Money-path suites (inventory concurrency, booking state, pricing, commission, refund, ledger, Payme/Click contracts, hold expiry).

```bash
# Start test MySQL (port 3307)
npm run test:db:up

# Point Prisma at the test DB (both vars — Prisma client reads DATABASE_URL)
# PowerShell:
#   $env:TEST_DATABASE_URL="mysql://safar:safar@127.0.0.1:3307/safartrip_test"
#   $env:DATABASE_URL=$env:TEST_DATABASE_URL
# bash:
#   export TEST_DATABASE_URL=mysql://safar:safar@127.0.0.1:3307/safartrip_test
#   export DATABASE_URL="$TEST_DATABASE_URL"
npm run test:db:reset

# Unit only (no DB)
npm run test:unit

# Integration (needs TEST_DATABASE_URL)
npm run test:integration

# All projects (CI default)
npm test

npm run typecheck
npm run lint
```

**Merge bar:** CI green = `typecheck` + `lint` + Vitest (unit + integration). Manual Payme/Click sandbox (`scripts/test-payme.ts` if present) is **not** required for merge and must not hit live merchants in CI.

**PR review (payment):** after each refactor, open a new chat and paste [`docs/PR_REVIEW_PROMPT.md`](docs/PR_REVIEW_PROMPT.md). Roadmap: [`ARCHITECTURE.md`](ARCHITECTURE.md).

Stop test DB: `npm run test:db:down`.

## Deploy

Never patch production by hand (`scp` / SSH edits). Flow: local → commit → push → server `git pull` + deploy script.

```bash
# Preferred safe path (migrate + typecheck + lint + unit tests + build + pm2 reload)
npm run deploy:safe
# on server: bash scripts/deploy-safe.sh

# Legacy: scripts/deploy.sh still uses db:push (cut over when ready)
```

**Rollback:**

```bash
cd /var/www/safar
git fetch origin && git checkout <previous_sha>
# or: git reset --hard <previous_sha>
bash scripts/deploy-safe.sh
# If a forward-only migration is incompatible: restore DB dump first, then code
```

## Loyihani ishga tushirish

```bash
npm run dev
```

Brauzerda oching: [http://localhost:3000](http://localhost:3000)

## Foydali buyruqlar

```bash
npm run dev           # local development
npm run build         # production build
npm run start         # production server
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # vitest run
npm run deploy:safe   # safe server deploy
```

## Asosiy papkalar

- `app/` — UI sahifalar va API route'lar
- `app/api/` — backend endpointlar
- `lib/` — umumiy util/service/helperlar
- `src/modules/` — booking, inventory, payment, rates, ledger, outbox
- `prisma/` — schema va migrationlar
- `scripts/` — seed, deploy, workers

## Eslatma

Hozirgi branch: `main`  
Remote: `git@github.com:rustamjon26/safartripuz.git`
