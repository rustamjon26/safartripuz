# SafarTrip — mijoz ilovasi (Expo)

React Native + Expo Router ilovasi: mehmonxona, uy mehmonxonasi, taxi, ekskursiya bronlari, sayohat rejasi va to'lovlar.

## Talablar

- Node.js 20+
- `npm install` (loyiha papkasida)

## O'rnatish va ishga tushirish

```bash
cd safartrip-customer
npm install
npx expo start
```

Keyin Expo Go yoki `npx expo run:android` / `npx expo run:ios` bilan oching.

## Backend ulanishi

API manzili `EXPO_PUBLIC_API_URL` orqali beriladi (Expo public o'zgaruvchi).

- **Mahalliy ish**: `.env` faylida `EXPO_PUBLIC_API_URL=http://localhost:3000` (Next.js odatda `3000` portda).
- **Produksiya**: `.env.production` yoki EAS `env` — `https://api.safartrip.uz`.

Kodda `lib/constants.ts` ichida `API_BASE_URL` shu qiymatni ishlatadi.

## Ekranlar xaritasi

| Marshrut | Vazifasi |
|----------|----------|
| `/(auth)/login`, `/(auth)/register` | Kirish / ro'yxatdan o'tish |
| `/(tabs)/index` | Bosh sahifa: qidiruv, xizmatlar, faol sayohat, tezkor taxi |
| `/(tabs)/trips` | Sayohat rejalari ro'yxati |
| `/(tabs)/bookings` | Mehmonxona / uy / taxi / ekskursiya bronlari (tablar) |
| `/(tabs)/profile` | Profil, statistika, chiqish |
| `/hotel`, `/hotel/[id]` | Mehmonxona qidiruv va detal, bron |
| `/homestay`, `/homestay/[id]` | Uy mehmonxonasi |
| `/taxi`, `/taxi/[id]` | Taxi buyurtma va kuzatuv, sharh |
| `/guide`, `/guide/[id]` | Ekskursiya qidiruv va bron |
| `/travel-plan/[id]` | Sayohat rejasi tafsilotlari va to'lov |
| `/payment/[planId]`, `/payment/result` | To'lov usuli va natija |
| `/profile/edit` | Profil tahriri (PUT `/api/user/profile`) |
| `/profile/payments` | To'lovlar tarixi |
| `/profile/help`, `/profile/contact` | FAQ va aloqa |

## Build (EAS)

```bash
eas build --platform android
eas build --platform ios
```

Oldindan `eas.json` va Expo hisob sozlangan bo'lishi kerak.

## Tekshiruv

```bash
npx tsc --noEmit
```
