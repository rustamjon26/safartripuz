# SafarTrip Haydovchi (Expo)

SafarTrip taxi haydovchilari uchun mobil ilova (Expo + React Native + Expo Router).

## Setup

1. Dependencies o'rnatish:
   - `npm install`
2. Environment fayllari:
   - `.env` (local): `EXPO_PUBLIC_API_URL=http://localhost:3000`
   - `.env.production` (prod): `EXPO_PUBLIC_API_URL=https://api.safartrip.uz`

## Run

- `npx expo start`
- Android: `npx expo start --android`
- iOS: `npx expo start --ios`
- Web: `npx expo start --web`

## Backend ulash (API_BASE_URL)

- `lib/constants.ts` ichida:
  - `API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"`
- Demak API manzil `.env` orqali boshqariladi.

## Ekranlar

- `app/(auth)/login.tsx` - haydovchi login sahifasi
- `app/(tabs)/dashboard.tsx` - online status, statistikalar, faol buyurtma
- `app/(tabs)/orders.tsx` - faol/tarix buyurtmalar, status actionlar
- `app/orders/[id].tsx` - buyurtma detali, timeline, yakunlash modal
- `app/(tabs)/earnings.tsx` - oy bo'yicha daromad hisobotlari
- `app/(tabs)/profile.tsx` - profil, litsenziya, transportlar, logout
- `app/vehicles/new.tsx` - yangi transport qo'shish formasi

## Build commands

- Android (EAS):
  - `npx eas build -p android`
- iOS (EAS):
  - `npx eas build -p ios`

