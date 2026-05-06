# Safartrip.uz

Safartrip — turizm platformasi. Loyiha ichida quyidagi modullar bor:

- HomeStay (host/guest/admin)
- Taxi (driver/customer/admin)
- Guide (partner/customer/admin)
- Travel plan va payment oqimi

Frontend va backend bir xil Next.js App Router loyihasida yuradi (`app/api/*` route handlers orqali).

## Texnologiyalar

- Next.js 16 + React 19 + TypeScript
- Prisma + PostgreSQL
- Tailwind CSS
- Zod (validatsiya)

## Talablar

- Node.js 18+ (tavsiya: 20+)
- npm
- PostgreSQL

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

Lokal Open Server MySQL uchun misol (root, parolsiz, `safartrip` bazasi):

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/safartrip"
```

## Prisma (DB) ishga tushirish

```bash
npx prisma db push
npx prisma generate
```

Agar kerak bo'lsa seed scriptlar:

```bash
node scripts/seed-test-users.mjs
```

## Loyihani ishga tushirish

```bash
npm run dev
```

Brauzerda oching: [http://localhost:3000](http://localhost:3000)

## Foydali buyruqlar

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # production server
npm run lint     # eslint
```

## Asosiy papkalar

- `app/` — UI sahifalar va API route'lar
- `app/api/` — backend endpointlar
- `lib/` — umumiy util/service/helperlar
- `prisma/` — schema va migrationlar
- `scripts/` — seed va servis scriptlar

## Eslatma

Hozirgi branch: `main`  
Remote: `git@github.com:rustamjon26/safartripuz.git`
