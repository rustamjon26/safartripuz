/** Frontend-only mock data for SafarTrip Staff mobile (Stitch pack 11). */

export const STAFF_USER = {
  firstName: "Anvar",
  fullName: "Jasur Alimov",
  title: "Katta Retsepsionist",
  rating: "4.9 / 5.0",
  avgSpeed: "12 daq",
  tasksDone: 148,
  growth: "+12%",
};

export const DASH_KPIS = [
  { id: "tasks", label: "Bugungi vazifalar", value: "12", hint: "+2 kechaga nisbatan" },
  { id: "commission", label: "Komissiya (UZS)", value: "4.2M", hint: "Oktabr" },
];

export const NEWS = [
  {
    id: "n1",
    title: "Yangi xizmat standarti",
    body: "Mehmonlar bilan muloqot qilishning yangi qoidalari tasdiqlandi.",
    when: "2 soat avval",
    tone: "info" as const,
  },
  {
    id: "n2",
    title: "VIP mehmon tashrifi",
    body: "Soat 14:00 da 102-xonaga maxsus transfer tayyorlansin.",
    when: "Bugun, 09:15",
    tone: "warn" as const,
  },
  {
    id: "n3",
    title: "Hafta xodimi",
    body: "Malika Azizova eng yuqori reyting bilan haftaning eng yaxshisi bo‘ldi!",
    when: "Kecha",
    tone: "ok" as const,
  },
];

export const SHIFT_STATS = [
  { label: "Jami soatlar", value: "38h" },
  { label: "Smenalar", value: "5", hint: "Ushbu hafta" },
  { label: "Oylik prognoz", value: "162h", hint: "Kutilmoqda" },
];

export const WEEK_DAYS = [
  { d: "Du", n: 12, active: false },
  { d: "Se", n: 13, active: false },
  { d: "Ch", n: 14, active: true },
  { d: "Pa", n: 15, active: false },
  { d: "Ju", n: 16, active: false },
  { d: "Sh", n: 17, active: false },
  { d: "Ya", n: 18, active: false },
];

export const SHIFTS = [
  {
    id: "s1",
    title: "Kutib olish (Airport)",
    when: "Bugun",
    time: "14:00 - 22:00",
    place: "Terminal 2, VIP Hall",
  },
  {
    id: "s2",
    title: "Shahar bo‘ylab sayohat",
    when: "Ertaga",
    time: "09:00 - 18:00",
    place: "Chorsu maydoni",
  },
  {
    id: "s3",
    title: "Mijozlarni qo‘llab-quvvatlash",
    when: "Kechki smena",
    time: "16:00 - 00:00",
    place: "Reception desk",
  },
];

export type TaskPriority = "high" | "mid" | "low" | "done";
export type TaskStatus = "progress" | "pending" | "done";

export const TASKS = [
  {
    id: "t1",
    title: "302-xonani tozalash",
    desc: "Mehmon soat 15:00 da keladi. VIP to‘plam tayyorlansin.",
    priority: "high" as TaskPriority,
    status: "progress" as TaskStatus,
    due: "14:30 gacha",
    assignee: "Aziz Mansurov",
    initials: "AM",
  },
  {
    id: "t2",
    title: "Mehmonni kutib olish",
    desc: "Janob Alisherov, Toshkent aeroporti, Terminal 2.",
    priority: "mid" as TaskPriority,
    status: "pending" as TaskStatus,
    due: "16:00 gacha",
    assignee: "Smena jamoasi",
    initials: "SK",
  },
  {
    id: "t3",
    title: "Mini-bar inventarizatsiyasi",
    desc: "4-qavatdagi barcha bo‘sh xonalarni tekshirish.",
    priority: "low" as TaskPriority,
    status: "pending" as TaskStatus,
    due: "Bugun",
    assignee: "Jasur Safarov",
    initials: "JS",
  },
  {
    id: "t4",
    title: "Restoran menyusi yangilanishi",
    desc: "Kechki menyu chop etildi va joylashtirildi.",
    priority: "done" as TaskPriority,
    status: "done" as TaskStatus,
    due: "Bajarildi",
    assignee: "Restoran",
    initials: "RT",
  },
];

export const THREADS = [
  {
    id: "reception",
    name: "Reception (Qabulxona)",
    preview: "302-xona tayyor.",
    when: "Hozir",
    unread: 2,
    group: true,
  },
  {
    id: "malika",
    name: "Malika Azizova",
    preview: "Smenani tasdiqlaysizmi?",
    when: "10:45",
    unread: 0,
    group: false,
  },
  {
    id: "hk",
    name: "Housekeeping (Tozalash)",
    preview: "Yangi vazifa biriktirildi.",
    when: "Kecha",
    unread: 1,
    group: true,
  },
  {
    id: "jamshid",
    name: "Jamshid Karimov",
    preview: "Ok, tushunarli.",
    when: "Duyshanba",
    unread: 0,
    group: false,
  },
  {
    id: "resto",
    name: "Restoran Jamoasi",
    preview: "Menyu yangilandi.",
    when: "Duyshanba",
    unread: 0,
    group: true,
  },
];

export const CHAT_MESSAGES = [
  { id: "m1", from: "Jasur", me: false, text: "302-xona mehmoni soat 14:00 da keladi.", time: "11:32" },
  { id: "m2", from: "Dilnoza", me: false, text: "Xona tayyorlash boshlandi.", time: "11:45" },
  { id: "m3", from: "Men", me: true, text: "Tushunarli, nazoratga olindi.", time: "11:48" },
  { id: "m4", from: "Jasur", me: false, text: "Rahmat!", time: "11:50" },
];

export const TRAINING_TRACKS = [
  { id: "std", title: "Xizmat Standartlari", pct: 65, desc: "Oltin qoidalar va korporativ etika." },
  { id: "sec", title: "Xavfsizlik", pct: 30, desc: "Mehmon va xodim xavfsizligi choralari." },
  { id: "com", title: "Muloqot", pct: 90, desc: "Madaniyatlararo muloqot va nizolar." },
];

export const TRAINING_COURSES = [
  {
    id: "premium",
    tag: "Micro-Learning · 15 min",
    title: "Premium Mehmonlarga Xizmat Ko‘rsatish",
    desc: "Yuqori martabali mehmonlarning kutishlarini qondirish usullari.",
  },
  {
    id: "tea",
    tag: "Xizmat Standartlari",
    title: "Choy uzatish etiketi",
    desc: "O‘zbek mehmondo‘stligi an’analari asosida choy uzatish.",
  },
  {
    id: "en",
    tag: "Muloqot",
    title: "Ingliz tili: Terminal terminologiyasi",
    desc: "Aeroport va vokzal hududida xorijiy sayyohlar bilan muloqot.",
  },
  {
    id: "aid",
    tag: "Xavfsizlik",
    title: "Birinchi yordam asoslari",
    desc: "Favqulodda vaziyatlarda tezkor birinchi yordam.",
  },
];

export const MODULE_STEPS = [
  {
    id: 1,
    title: "Tabassum bilan kutib olish",
    body: "Mehmon bilan ko‘z muloqotini o‘rnating va samimiy tabassum qiling.",
    done: true,
  },
  {
    id: 2,
    title: "Milliy ehtirom ko‘rsatish",
    body: "O‘ng qo‘lingizni ko‘ksingizga qo‘yib, “Assalomu alaykum, Xush kelibsiz!” deb kutib oling.",
    done: true,
  },
  {
    id: 3,
    title: "Ehtiyojlarni aniqlash",
    body: "Yuklarga yordam bering va dam olish yoki ichimlik taklif eting.",
    done: false,
    current: true,
  },
  {
    id: 4,
    title: "Premium servislarni taklif qilish",
    body: "Maxsus xizmatlar va eksklyuziv imkoniyatlar haqida ma’lumot bering.",
    done: false,
    locked: true,
  },
];

export const CERTIFICATES = [
  { id: "c1", title: "Xizmat Ustasi", when: "May, 2023 berilgan" },
  { id: "c2", title: "Xavfsizlik Mutaxassisi", when: "Avgust, 2023 berilgan" },
];

export const UPCOMING_TRAININGS = [
  {
    id: "u1",
    when: "Ertaga, 10:00",
    title: "Samarqand Tarixi: Chuqurlashtirilgan Kurs",
    meta: "Spiker: Prof. Alisher Qodirov",
  },
  {
    id: "u2",
    when: "24-Oktyabr",
    title: "Mijozlar bilan Muloqot Etiketi",
    meta: "Amaliy Mashg‘ulot (Offline)",
  },
  {
    id: "u3",
    when: "27-Oktyabr",
    title: "Ingliz tili: Sayyohlik Terminologiyasi",
    meta: "Onlayn Webinar",
  },
];

export const EARNINGS = [
  {
    id: "e1",
    title: "Xizmat komissiyasi",
    meta: "ID: #88291 · 14 Mart",
    amount: "+45,000 UZS",
  },
  {
    id: "e2",
    title: "Mukofot puli (KPI)",
    meta: "Fevral oyi uchun · 10 Mart",
    amount: "+1,200,000 UZS",
  },
];
