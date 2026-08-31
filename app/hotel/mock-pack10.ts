/** Frontend-only demo data for Stitch pack 10 (hotel PMS enhancements). */

export const FINANCE_ANALYTICS_KPIS = [
  {
    id: "revenue",
    label: "Umumiy tushum",
    value: "452,000,000",
    unit: "so‘m",
    hint: "+12.5%",
    tone: "up" as const,
  },
  {
    id: "adr",
    label: "O‘rtacha kunlik narx (ADR)",
    value: "850,000",
    unit: "so‘m",
    hint: "+4.2%",
    tone: "up" as const,
  },
  {
    id: "revpar",
    label: "RevPAR",
    value: "620,000",
    unit: "so‘m",
    hint: "−1.8%",
    tone: "down" as const,
  },
  {
    id: "profit",
    label: "Sof foyda",
    value: "186,400,000",
    unit: "so‘m",
    hint: "+8.9%",
    tone: "up" as const,
  },
];

export const REVENUE_SERIES = [
  { label: "01 Mar", current: 52, previous: 44 },
  { label: "08 Mar", current: 61, previous: 48 },
  { label: "15 Mar", current: 68, previous: 52 },
  { label: "22 Mar", current: 74, previous: 58 },
  { label: "29 Mar", current: 70, previous: 63 },
];

export const TOP_ROOMS = [
  { name: "Royal Suite 402", bookings: 24, occupancy: 88, revenue: "82.4 mln" },
  { name: "Deluxe Twin 105", bookings: 32, occupancy: 92, revenue: "76.8 mln" },
  { name: "Junior Suite 202", bookings: 18, occupancy: 75, revenue: "54.2 mln" },
];

export const PAYMENT_HISTORY = [
  {
    id: "p1",
    guest: "Anvar Karimov",
    method: "Payme",
    amount: "1,200,000",
    status: "success" as const,
    when: "Bugun, 14:20",
  },
  {
    id: "p2",
    guest: "Elena Petrova",
    method: "Click",
    amount: "850,000",
    status: "pending" as const,
    when: "Bugun, 11:05",
  },
  {
    id: "p3",
    guest: "Artel Electronics",
    method: "Transfer",
    amount: "23,436,000",
    status: "success" as const,
    when: "Kecha",
  },
];

export const INVOICE_LINE_PRESETS = [
  { name: "Deluxe Room Blocks (3 kecha)", qty: 12, price: 1_200_000 },
  { name: "Catering: Buffet Lunch", qty: 1, price: 5_500_000 },
  { name: "Event Space: Grand Ballroom", qty: 1, price: 5_500_000 },
  { name: "AV Equipment: LED Screen", qty: 1, price: 2_500_000 },
  { name: "Xavfsizlik xizmati (Security)", qty: 4, price: 450_000 },
];

export const DEMO_INVOICE = {
  number: "INV-2024-092",
  dateLabel: "20-Oktabr, 2024",
  status: "To‘lov kutilmoqda",
  supplier: {
    name: "SafarTrip HQ",
    address: "Amir Temur ko‘chasi, 107B",
    city: "Toshkent shahri, 100084",
    country: "O‘zbekiston",
    email: "billing@safartrip.uz",
    phone: "+998 71 234 56 78",
  },
  client: {
    name: "Artel Electronics",
    address: "Rohat aylanmasi, Bektemir tumani",
    city: "Toshkent shahri, 100000",
    country: "O‘zbekiston",
    stir: "301234567",
  },
  terms: "To‘lov shartlari: 15-maygacha amalga oshirilishi lozim. 30% avans to‘lovi talab qilinadi.",
  project: "Silk Road Forum 2024",
  bank: {
    name: "Ipak Yo‘li Banki",
    iban: "UZ24 0012 3456 7890 1234 5678",
    swift: "IPAKUZ22",
  },
  vatRate: 8,
};

export type IntegrationStatus = "connected" | "disconnected" | "pending" | "license";

export type IntegrationItem = {
  id: string;
  name: string;
  desc: string;
  status: IntegrationStatus;
  meta: string;
  badges?: string[];
};

export const INTEGRATION_GROUPS: Array<{
  id: string;
  title: string;
  items: IntegrationItem[];
}> = [
  {
    id: "ota",
    title: "Onlayn bron qilish tizimlari (OTA)",
    items: [
      {
        id: "booking",
        name: "Booking.com",
        desc: "Global bron tizimi bilan xona holati va narxlarni avtomatik yangilang.",
        status: "connected",
        meta: "Ulangan",
        badges: ["API", "XML"],
      },
      {
        id: "expedia",
        name: "Expedia",
        desc: "Shimoliy Amerika va Yevropa bozorlariga kirish uchun Expedia tarmog‘iga ulaning.",
        status: "pending",
        meta: "Kutish rejimida",
      },
      {
        id: "airbnb",
        name: "Airbnb",
        desc: "Turistik uylar va kvartiralar uchun global platforma integratsiyasi.",
        status: "license",
        meta: "Litsenziya talab etiladi",
      },
    ],
  },
  {
    id: "payments",
    title: "To‘lov tizimlari (Payment Gateways)",
    items: [
      {
        id: "payme",
        name: "Payme Business",
        desc: "Mahalliy kartalar orqali to‘lovlar va avtomatik fiskal chek.",
        status: "connected",
        meta: "Sinxronizatsiya faol",
      },
      {
        id: "click",
        name: "Click Evolution",
        desc: "QR-kod va billing orqali to‘lovlarni boshqarish.",
        status: "connected",
        meta: "Ulangan",
      },
      {
        id: "uzum",
        name: "Uzum Bank",
        desc: "Uzum ekotizimi orqali to‘lov yechimlari va keshbek.",
        status: "disconnected",
        meta: "Yangi xizmat",
      },
    ],
  },
  {
    id: "local",
    title: "Mahalliy xizmatlar (Taxi/Guides)",
    items: [
      {
        id: "yandex",
        name: "Yandex Go Business",
        desc: "Mehmonlar uchun transfer bron qilish va korporativ hisob.",
        status: "connected",
        meta: "5 ta faol haydovchi",
      },
      {
        id: "guides",
        name: "Silk Road Guides",
        desc: "Professional gidlar tarmog‘i va ekskursiyalar buyurtmasi.",
        status: "disconnected",
        meta: "Hamkorlik mavjud",
      },
    ],
  },
];

export const CHECKIN_EXTRAS = [
  { id: "breakfast", label: "Nonushta", priceLabel: "150,000" },
  { id: "wifi", label: "Yuqori tezlikdagi WiFi", priceLabel: "0" },
  { id: "late", label: "Kechki check-out", priceLabel: "200,000" },
];
