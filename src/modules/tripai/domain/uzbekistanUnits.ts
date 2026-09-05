/**
 * Official Uzbekistan admin units for guest-AI (section 1 skeleton).
 * hotel_hub = catalog city when we can sell rooms; otherwise nearest_hub is a suggestion only.
 */

export type UzUnit = {
  id: string;
  name_uz: string;
  capital: string;
  hotel_hub: string | null;
  nearest_hub: string;
  aliases: string[];
  themes: string[];
  guest_blurb_uz: string;
  typical_days: number;
};

export const UZ_UNITS: UzUnit[] = [
  {
    id: "toshkent_shahri",
    name_uz: "Toshkent shahri",
    capital: "Toshkent",
    hotel_hub: "Toshkent",
    nearest_hub: "Toshkent",
    aliases: ["toshkent", "tashkent", "ташкент", "toshkent shahri", "tashkent city"],
    themes: ["poytaxt", "oilaviy"],
    guest_blurb_uz:
      "O'zbekistonning poytaxti — metro, muzeylar va yashil bog'lardan iborat zamonaviy shahar. Ko'pchilik sayohat shu yerdan boshlanadi yoki tugaydi.",
    typical_days: 2,
  },
  {
    id: "toshkent_viloyati",
    name_uz: "Toshkent viloyati",
    capital: "Nurafshon",
    hotel_hub: null,
    nearest_hub: "Toshkent",
    aliases: [
      "toshkent viloyati",
      "tashkent region",
      "ташкентская область",
      "nurafshon",
      "chimyon",
      "chorvoq",
    ],
    themes: ["tog", "tabiat", "oilaviy"],
    guest_blurb_uz:
      "Toshkent atrofidagi tog' etaklari — Chimyon va Chorvoq ko'li dam olish uchun mashhur. Qishda chang'i, yozda tabiatga chiqish uchun qulay hudud.",
    typical_days: 1,
  },
  {
    id: "samarqand_viloyati",
    name_uz: "Samarqand viloyati",
    capital: "Samarqand",
    hotel_hub: "Samarqand",
    nearest_hub: "Samarqand",
    aliases: ["samarqand", "samarkand", "самарканд", "samarqand viloyati"],
    themes: ["tarixiy", "ipak_yoli", "ziyorat"],
    guest_blurb_uz:
      "Registon, Gur-Amir va Shohi Zinda kabi Buyuk ipak yo'li yodgorliklari joylashgan viloyat. Tarixga qiziquvchilar uchun mamlakatdagi asosiy manzillardan biri.",
    typical_days: 2,
  },
  {
    id: "buxoro_viloyati",
    name_uz: "Buxoro viloyati",
    capital: "Buxoro",
    hotel_hub: "Buxoro",
    nearest_hub: "Buxoro",
    aliases: ["buxoro", "bukhara", "бухара", "buxara"],
    themes: ["tarixiy", "ipak_yoli", "ziyorat"],
    guest_blurb_uz:
      "Minglab yillik tarixga ega qadimiy shahar — Labi Hovuz, Ark qal'asi va ko'plab masjid-madrasalar. Eski shahar piyoda aylanish uchun juda qulay.",
    typical_days: 2,
  },
  {
    id: "xorazm_viloyati",
    name_uz: "Xorazm viloyati",
    capital: "Urganch",
    hotel_hub: "Xiva",
    nearest_hub: "Xiva",
    aliases: ["xorazm", "khorezm", "хорезм", "xiva", "urganch", "urgench"],
    themes: ["tarixiy", "ipak_yoli"],
    guest_blurb_uz:
      "Xiva shahridagi Ichan-Qal'a — UNESCO ro'yxatidagi devor bilan o'ralgan muzey-shahar. Butun viloyat qadimiy me'morchiligi bilan mashhur.",
    typical_days: 1,
  },
  {
    id: "qashqadaryo_viloyati",
    name_uz: "Qashqadaryo viloyati",
    capital: "Qarshi",
    hotel_hub: null,
    nearest_hub: "Samarqand",
    aliases: ["qashqadaryo", "kashkadarya", "кашкадарья", "qarshi", "shahrisabz"],
    themes: ["tarixiy", "ipak_yoli"],
    guest_blurb_uz:
      "Shahrisabzda Amir Temur tug'ilgan joy va Oqsaroy saroyi qoldiqlari joylashgan. Samarqanddan tog' oshib bir necha soatda yetib bo'ladi.",
    typical_days: 1,
  },
  {
    id: "surxondaryo_viloyati",
    name_uz: "Surxondaryo viloyati",
    capital: "Termiz",
    hotel_hub: null,
    nearest_hub: "Samarqand",
    aliases: ["surxondaryo", "surkhandarya", "сурхандарья", "termiz", "termez"],
    themes: ["tarixiy", "ziyorat"],
    guest_blurb_uz:
      "Termiz — qadimiy Kushon davri va buddaviylik yodgorliklariga boy shahar. Mamlakatning eng janubidagi, Afg'oniston chegaradosh viloyati.",
    typical_days: 1,
  },
  {
    id: "navoiy_viloyati",
    name_uz: "Navoiy viloyati",
    capital: "Navoiy",
    hotel_hub: null,
    nearest_hub: "Buxoro",
    aliases: ["navoiy", "navoi", "навои"],
    themes: ["cho'l", "ko'l", "tabiat"],
    guest_blurb_uz:
      "Nurota tog'lari, Sentob qishlog'i va Qizilqum cho'li shu yerda joylashgan. Aydar ko'li ekoturizm uchun tobora ko'proq tanilmoqda.",
    typical_days: 1,
  },
  {
    id: "jizzax_viloyati",
    name_uz: "Jizzax viloyati",
    capital: "Jizzax",
    hotel_hub: "Jizzax",
    nearest_hub: "Jizzax",
    aliases: ["jizzax", "jizzakh", "джизак"],
    themes: ["tog", "tabiat"],
    guest_blurb_uz:
      "Zomin milliy bog'i archazor tog'lari va toza havosi bilan mashhur dam olish maskani. Yozda salqin, tabiat sayrlari uchun qulay hudud.",
    typical_days: 2,
  },
  {
    id: "sirdaryo_viloyati",
    name_uz: "Sirdaryo viloyati",
    capital: "Guliston",
    hotel_hub: null,
    nearest_hub: "Jizzax",
    aliases: ["sirdaryo", "syrdarya", "сырдарья", "guliston", "gulistan"],
    themes: ["oilaviy", "tabiat"],
    guest_blurb_uz:
      "Mamlakatning eng kichik viloyati, Sirdaryo bo'yida joylashgan qishloq xo'jaligi hududi. Turistik infratuzilma boshqa viloyatlarga nisbatan kamroq rivojlangan.",
    typical_days: 1,
  },
  {
    id: "fargona_viloyati",
    name_uz: "Farg'ona viloyati",
    capital: "Farg'ona",
    hotel_hub: null,
    nearest_hub: "Toshkent",
    aliases: ["fargona", "farg'ona", "fergana", "фергана", "fargona vodiysi"],
    themes: ["vodiy", "oilaviy"],
    guest_blurb_uz:
      "Farg'ona vodiysining markazi — Rishton kulolchiligi va Marg'ilon ipagi kabi hunarmandchilik bilan mashhur. Zich aholi va boy qishloq xo'jaligi hududi.",
    typical_days: 1,
  },
  {
    id: "andijon_viloyati",
    name_uz: "Andijon viloyati",
    capital: "Andijon",
    hotel_hub: null,
    nearest_hub: "Toshkent",
    aliases: ["andijon", "andijan", "андижан"],
    themes: ["vodiy", "tarixiy"],
    guest_blurb_uz:
      "Zahiriddin Muhammad Bobur tug'ilgan shahar — Boburiylar tarixiga bag'ishlangan muzeylar joylashgan. Farg'ona vodiysining eng zich aholi yashaydigan viloyati.",
    typical_days: 1,
  },
  {
    id: "namangan_viloyati",
    name_uz: "Namangan viloyati",
    capital: "Namangan",
    hotel_hub: null,
    nearest_hub: "Toshkent",
    aliases: ["namangan", "наманган"],
    themes: ["vodiy", "tabiat"],
    guest_blurb_uz:
      "Farg'ona vodiysining shimoliy qismida joylashgan, bog'lar va uzumzorlar bilan mashhur hudud. Chortoq issiq buloqlari yaqin atrofda joylashgan.",
    typical_days: 1,
  },
  {
    id: "qoraqalpogiston_respublikasi",
    name_uz: "Qoraqalpog'iston Respublikasi",
    capital: "Nukus",
    hotel_hub: null,
    nearest_hub: "Xiva",
    aliases: [
      "qoraqalpogiston",
      "karakalpakstan",
      "каракалпакстан",
      "nukus",
      "moynoq",
      "mo'ynoq",
    ],
    themes: ["cho'l", "ko'l", "tabiat"],
    guest_blurb_uz:
      "Nukus — Savitskiy muzeyi va Orolbo'yi hududiga (Mo'ynoq) kirish nuqtasi. Cho'l va sobiq dengiz tubi manzaralari bilan noyob hudud.",
    typical_days: 2,
  },
];

