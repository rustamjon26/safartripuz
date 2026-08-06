# Payme Merchant API — Shohjahon / kassa ulash

Payme Business merchant kassa yaratish uchun kerak bo‘lgan ma’lumotlar.
Manba: [Merchant API protokoli](https://developer.help.paycom.uz/protokol-merchant-api/),
[metodlar](https://developer.help.paycom.uz/metody-merchant-api/).

## Shohjahonga yuboriladigan

### 1) Endpoint URL (asosiy — travel plan / checkout)

```
https://safartrip.uz/api/payments/webhook/payme
```

Bu endpoint `account.order_id` bilan ishlaydi. Saytdagi asosiy to‘lov
(`POST /api/payments/create` → Payme) shu yo‘lga ulangan.

### 2) Account parametrlari

| Key | Tip | Ma’nosi |
| --- | --- | --- |
| `order_id` | string | Bizning `Payment.id` (cuid). Checkout: `ac.order_id=<Payment.id>` |

Checkout GET misoli (base64 ichida):

```
m=<MERCHANT_ID>;ac.order_id=<PAYMENT_ID>;a=<AMOUNT_TIYIN>;c=https://safartrip.uz/payments/success?paymentId=<PAYMENT_ID>
```

### 3) Ixtiyoriy ikkinchi kassa (legacy hotel Booking)

Agar alohida hotel booking stack ham kerak bo‘lsa:

```
https://safartrip.uz/api/payme
```

| Key | Tip | Ma’nosi |
| --- | --- | --- |
| `booking_id` | string | Legacy `Booking.id` |

Checkout: `ac.booking_id=<BOOKING_ID>`.

**Birinchi kassa sifatida `order_id` endpointni bersangiz yetadi.**

### 4) Auth

Payme → bizga JSON-RPC `POST`, header:

```
Authorization: Basic base64("Paycom:<merchantKey>")
```

`merchantId` + `merchantKey` Admin → Settings → Payments (`payment_providers.payme`)
orqali DB’da saqlanadi (`.env` emas).

---

## Amalga oshirilgan Merchant API usullari

| Usul | `order_id` stack | `booking_id` stack |
| --- | --- | --- |
| CheckPerformTransaction | ✅ + fiscal `detail` | ✅ + fiscal `detail` |
| CreateTransaction | ✅ | ✅ |
| PerformTransaction | ✅ (ledger + booking confirm) | ✅ |
| CancelTransaction | ✅ | ✅ |
| CheckTransaction | ✅ | ✅ |
| GetStatement | ✅ | ✅ |

`PerformTransaction` — to‘lovni tasdiqlash uchun oxirgi usul (Shohjahon).

---

## Fiscal `detail` (soliq oboroti)

`CheckPerformTransaction` muvaffaqiyatli javobi:

```json
{
  "allow": true,
  "detail": {
    "receipt_type": 0,
    "items": [
      {
        "title": "SafarTrip sayohat to'lovi",
        "price": 1500000,
        "count": 1,
        "code": "<MXIK>",
        "package_code": "<PACKAGE>",
        "vat_percent": 12
      }
    ]
  }
}
```

`price` — **tiyin** (butun son). MXIK + `package_code` juftligini
[Soliq tasnif](https://tasnif.soliq.uz/attribute/) da tekshiring.

Runtime env (ixtiyoriy, default bor):

```bash
PAYME_MXIK_CODE=...          # Soliq MXIK
PAYME_PACKAGE_CODE=...       # o‘lchov birligi (MXIK ga bog‘langan)
PAYME_VAT_PERCENT=12
PAYME_IS_TEST=true           # test.paycom.uz checkout (faqat test)
NEXT_PUBLIC_PAYME_MERCHANT_ID=...   # browser checkout (booking_id stack)
NEXT_PUBLIC_APP_URL=https://safartrip.uz
```

---

## Ops checklist (kassa ochilgach)

1. Admin → Settings → Payments: Payme `enabled`, `merchantId`, `merchantKey`.
2. Payme kabinetda Endpoint URL = yuqoridagi webhook.
3. Test: kichik summa → CheckPerform → Create → Perform (Payme test yoki 1 so‘m).
4. `pm2 logs safartrip` da Payme xatolik yo‘qligini ko‘ring.
5. MXIK/package_code ni Shohjahon/buxgalter bilan tasdiqlang — default placeholder.

## Checkout init (mijoz)

- GET: [otpravka-cheka GET](https://developer.help.paycom.uz/initsializatsiya-platezhey/otpravka-cheka-po-metodu-get)
- POST: [otpravka-cheka POST](https://developer.help.paycom.uz/initsializatsiya-platezhey/otpravka-cheka-po-metodu-post)

Biz travel-plan uchun GET (base64) ishlatamiz; hotel UI `lib/payme.ts` orqali
GET yoki POST qilishi mumkin.
