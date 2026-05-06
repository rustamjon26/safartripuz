/** Shown when fewer than 3 real 5★ reviews exist in the database. */
export const FEATURED_REVIEWS_FALLBACK = [
  {
    id: "fb-1",
    author: "Dilnoza",
    text: "Zomin — hayotimda ko'rgan eng go'zal joy. SafarTrip bilan bron qilish juda oson bo'ldi, mehmonxona ajoyib edi!",
    destination: "🏔️ Zomin",
    date: "Avgust 2024",
  },
  {
    id: "fb-2",
    author: "Malika",
    text: "Jizzax tarixi haqida hech narsa bilmas edim. Gidimiz barcha narsalarni shunday qiziqarli qilib aytdiki, yana bormoqchiman.",
    destination: "🌆 Jizzax",
    date: "Sentyabr 2024",
  },
  {
    id: "fb-3",
    author: "Jasur",
    text: "Oilam bilan Zomin ko'liga bordik. Bolalar suvda o'ynashdi, biz dam oldik. Hayotimizning eng yaxshi ta'tili bo'ldi.",
    destination: "🏔️ Zomin",
    date: "Iyul 2024",
  },
  {
    id: "fb-4",
    author: "Odilbek",
    text: "Hammasi bir joyda jamlangani qulay ekan. Vaqtni tejab, ishonchli xizmatlardan foydalandik. Kattakon rahmat!",
    destination: "🌆 Jizzax",
    date: "Oktyabr 2024",
  },
] as const;

export type FeaturedReview = {
  id: string;
  author: string;
  text: string;
  destination: string;
  date: string;
};
