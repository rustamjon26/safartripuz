/** Frontend-only mock data for Feedback & Support panel. Backend later. */

export type FeedbackService = "tour" | "hotel" | "transport" | "all";
export type FeedbackStatus = "answered" | "unanswered";

export type FeedbackItem = {
  id: string;
  author: string;
  initials: string;
  rating: number;
  dateLabel: string;
  service: Exclude<FeedbackService, "all">;
  serviceLabel: string;
  quote: string;
  status: FeedbackStatus;
  reply?: {
    text: string;
    dateLabel: string;
  };
};

export const OVERVIEW_KPIS = [
  {
    id: "rating",
    label: "Umumiy reyting",
    value: "4.8",
    hint: "+0.2 vs o‘tgan oy",
    tone: "ok" as const,
  },
  {
    id: "reviews",
    label: "Sharhlar soni",
    value: "1,248",
    hint: "+142 oxirgi 30 kun",
    tone: "info" as const,
  },
  {
    id: "response",
    label: "Javob berish ko‘rsatkichi",
    value: "92%",
    hint: "−5% vs o‘tgan oy",
    tone: "warn" as const,
  },
  {
    id: "sentiment",
    label: "Kayfiyat indeksi",
    value: "88",
    hint: "Zo‘r",
    tone: "ok" as const,
  },
];

export const SENTIMENT_DAYS = [
  { day: "Dush", positive: 72, negative: 18 },
  { day: "Sesh", positive: 80, negative: 14 },
  { day: "Chor", positive: 68, negative: 22 },
  { day: "Pay", positive: 88, negative: 10 },
  { day: "Jum", positive: 76, negative: 16 },
  { day: "Shan", positive: 92, negative: 8 },
  { day: "Yak", positive: 84, negative: 12 },
];

export const CATEGORY_SCORES = [
  { name: "Xizmat ko‘rsatish", score: 4.9 },
  { name: "Tozalik", score: 4.7 },
  { name: "Narx va sifat", score: 4.6 },
  { name: "Aniqlik", score: 4.8 },
];

export const RECENT_REVIEWS = [
  {
    id: "r1",
    author: "Azizbek Jumanazarov",
    initials: "AJ",
    rating: 5,
    when: "2 soat oldin",
    quote:
      "Ajoyib sayohat bo‘ldi! Samarqanddagi mehmonxona xizmati juda yuqori darajada. Gidlar o‘z ishining ustalari.",
  },
  {
    id: "r2",
    author: "Malika Saidova",
    initials: "MS",
    rating: 4,
    when: "5 soat oldin",
    quote:
      "Umuman yaxshi, lekin check-in biroz uzoqroq cho‘zildi. Xona toza, personal mehmondo‘st.",
  },
  {
    id: "r3",
    author: "James Miller",
    initials: "JM",
    rating: 3,
    when: "Kecha",
    quote:
      "Tour was okay, but transport arrived 20 minutes late. Sites were beautiful.",
  },
];

export const FEEDBACK_ITEMS: FeedbackItem[] = [
  {
    id: "f1",
    author: "Elena Petrova",
    initials: "EP",
    rating: 5,
    dateLabel: "14-Oktabr, 2023",
    service: "tour",
    serviceLabel: "Samarqand Bo‘ylab Sayohat",
    quote:
      "Amazing experience! The guide was very knowledgeable and the atmosphere in Registan square was magical. The organization was top notch.",
    status: "unanswered",
  },
  {
    id: "f2",
    author: "James Miller",
    initials: "JM",
    rating: 3,
    dateLabel: "10-Oktabr, 2023",
    service: "tour",
    serviceLabel: "Buxoro Old Town Tour",
    quote:
      "The tour was okay, but the transport arrived 20 minutes late. The sites were beautiful but the pace was a bit too fast for me.",
    status: "answered",
    reply: {
      text: "Uzr so‘raymiz, Jeyms. Transport kechikishi bo‘yicha chora ko‘rdik va kelajakda bunday holatlar takrorlanmasligini ta’minlaymiz. Fikringiz uchun rahmat!",
      dateLabel: "11-Oktabr, 2023",
    },
  },
  {
    id: "f3",
    author: "Aziza Mansurova",
    initials: "AM",
    rating: 4,
    dateLabel: "9-Oktabr, 2023",
    service: "hotel",
    serviceLabel: "Registon Boutique Hotel",
    quote:
      "Xona juda qulay, nonushta mazali. Wi‑Fi biroz sekin, ammo umumiy taassurot ijobiy.",
    status: "unanswered",
  },
  {
    id: "f4",
    author: "Carlos Rivera",
    initials: "CR",
    rating: 2,
    dateLabel: "7-Oktabr, 2023",
    service: "transport",
    serviceLabel: "Toshkent → Samarqand transfer",
    quote:
      "Driver was polite but the car AC did not work well in the heat. Needs improvement.",
    status: "unanswered",
  },
  {
    id: "f5",
    author: "Dilnoza Karimova",
    initials: "DK",
    rating: 5,
    dateLabel: "5-Oktabr, 2023",
    service: "hotel",
    serviceLabel: "Bukhara Courtyard Stay",
    quote:
      "Mehmondo‘stlik a’lo! Personal har doim yordamga tayyor. Albatta yana kelamiz.",
    status: "answered",
    reply: {
      text: "Rahmat, Dilnoza opa! Sizni yana kutib qolamiz — maxsus mehmon sifatida.",
      dateLabel: "5-Oktabr, 2023",
    },
  },
];

export const QUICK_REPLIES = ["Rahmat", "Tashakkur", "Kutamiz"];

export const POSITIVE_KEYWORDS = [
  "Mehmondo‘stlik",
  "Go‘zal manzara",
  "Milliy taomlar",
  "Tezkor xizmat",
  "Qulay joylashuv",
];

export const NEGATIVE_KEYWORDS = [
  "Kutish vaqti",
  "Wi‑Fi tezligi",
  "Avtoturargoh",
  "Narx darajasi",
];

export const MARKET_COMPARE = [
  { label: "Xizmat sifati", brand: 92, market: 78 },
  { label: "Narx", brand: 74, market: 80 },
  { label: "Tozalik", brand: 88, market: 82 },
  { label: "Joylashuv", brand: 90, market: 85 },
  { label: "Taomlar", brand: 81, market: 76 },
];

export type ImprovementPriority = "high" | "mid" | "low";

export const IMPROVEMENT_AREAS = [
  {
    id: "i1",
    area: "Check-in jarayoni",
    description: "Mijozlar kutish vaqti 15 daqiqadan oshib ketmoqda.",
    count: 42,
    priority: "high" as ImprovementPriority,
    status: "Reja tuzish",
  },
  {
    id: "i2",
    area: "Nonushta sifati",
    description: "Issiq taomlar assortimentini ko‘paytirish taklif etilmoqda.",
    count: 28,
    priority: "mid" as ImprovementPriority,
    status: "Jarayonda",
  },
  {
    id: "i3",
    area: "Xona tozaligi",
    description: "Hammom jihozlaridagi mayda nosozliklar.",
    count: 15,
    priority: "low" as ImprovementPriority,
    status: "Reja tuzish",
  },
  {
    id: "i4",
    area: "Sayohat gidlari",
    description: "Ingliz tili darajasini oshirish bo‘yicha tavsiyalar.",
    count: 11,
    priority: "low" as ImprovementPriority,
    status: "Reja tuzish",
  },
];

export const PERFORMANCE_KPIS = [
  {
    id: "revenue",
    label: "Jami tushum (demo)",
    value: "458.2M UZS",
    hint: "+12.5%",
    tone: "ok" as const,
  },
  {
    id: "occupancy",
    label: "O‘rtacha bandlik",
    value: "82.4%",
    hint: "+5.2%",
    tone: "ok" as const,
  },
  {
    id: "csat",
    label: "Mijozlar mamnuniyati",
    value: "4.8 / 5.0",
    hint: "Barqaror",
    tone: "info" as const,
  },
  {
    id: "bookings",
    label: "Yangi bronlar",
    value: "1,248",
    hint: "−2.1%",
    tone: "warn" as const,
  },
];

export const OCCUPANCY_SERIES = [
  { label: "1 May", current: 62, previous: 58 },
  { label: "7 May", current: 70, previous: 64 },
  { label: "14 May", current: 78, previous: 72 },
  { label: "21 May", current: 85, previous: 76 },
  { label: "28 May", current: 82, previous: 80 },
];

export const REVENUE_SPLIT = [
  { label: "Xonalar", pct: 65 },
  { label: "Oshxona & Bar", pct: 20 },
  { label: "Tadbirlar", pct: 10 },
  { label: "Turlar & Transport", pct: 5 },
];

export const GUEST_GEO = [
  { country: "O‘zbekiston", pct: 42, flag: "UZ" },
  { country: "Rossiya", pct: 24, flag: "RU" },
  { country: "Turkiya", pct: 14, flag: "TR" },
  { country: "Yevropa", pct: 12, flag: "EU" },
  { country: "Boshqa", pct: 8, flag: "OT" },
];

export const AI_TIPS = [
  {
    title: "Narxlarni oshirish",
    body: "“Sharq Taronalari” festivali sababli 25–30 avgust kunlariga narxlarni 15% ga oshirish tavsiya etiladi.",
  },
  {
    title: "Aksiya yaratish",
    body: "Dushanba–Chorshanba kunlari uchun “Erta bron” 10% chegirmasini qo‘shing.",
  },
];
