/**
 * Guest themes (section 3). Multiple hubs → do not auto-pick a city.
 */

export type UzThemeMood =
  | "romantic"
  | "family"
  | "adventure"
  | "relax"
  | "business"
  | "any";

export type UzTheme = {
  id: string;
  name_uz: string;
  aliases: string[];
  catalog_hubs: string[];
  ask_first: boolean;
  mood: UzThemeMood;
  typical_days: number;
  guest_blurb_uz: string;
};

export const UZ_THEMES: UzTheme[] = [
  {
    id: "ipak_yoli",
    name_uz: "Ipak yo'li / tarixiy shaharlar",
    aliases: [
      "ipak yoli",
      "ipak yo'li",
      "silk road",
      "tarixiy shaharlar",
      "tarixiy shahar",
      "qadimiy shahar",
      "madaniy meros",
    ],
    catalog_hubs: ["Samarqand", "Buxoro", "Xiva"],
    ask_first: true,
    mood: "romantic",
    typical_days: 7,
    guest_blurb_uz:
      "Ipak yo'li — Samarqand, Buxoro, Xiva. Qaysi shahardan boshlaymiz, do'stim?",
  },
  {
    id: "tog_tabiat",
    name_uz: "Tog' va tabiat",
    aliases: ["toglar", "tog larga", "tabiat", "dam olish", "tog sayohat"],
    catalog_hubs: ["Zomin", "Toshkent"],
    ask_first: true,
    mood: "adventure",
    typical_days: 2,
    guest_blurb_uz:
      "Tog' uchun Zomin (Jizzax) yoki Chimyon/Chorvoq (Toshkent) yaxshi. Qaysi tomon?",
  },
  {
    id: "ziyorat",
    name_uz: "Ziyorat",
    aliases: ["ziyorat", "avliyo", "maqbaralar", "diniy safari"],
    catalog_hubs: ["Buxoro", "Samarqand", "Xiva"],
    ask_first: true,
    mood: "any",
    typical_days: 3,
    guest_blurb_uz:
      "Ziyorat uchun Buxoro, Samarqand yoki Xiva — qaysi yo'nalish yaqinroq?",
  },
  {
    id: "vodiy",
    name_uz: "Farg'ona vodiysi",
    aliases: ["fargona vodiysi", "fergana valley", "vodiy safari"],
    catalog_hubs: [],
    ask_first: true,
    mood: "family",
    typical_days: 3,
    guest_blurb_uz:
      "Farg'ona vodiysi — Qo'qon, Marg'ilon ipagi, Rishton kuloli. Katalogda mehmonxona kam; Toshkentdan boshlaylikmi?",
  },
  {
    id: "orol",
    name_uz: "Orolbo'yi",
    aliases: ["orol boyi", "orolbo'yi", "kemalar qabristoni"],
    catalog_hubs: ["Xiva"],
    ask_first: false,
    mood: "adventure",
    typical_days: 3,
    guest_blurb_uz:
      "Orol va Mo'ynoq — Nukus orqali. Mehmonxona hozir Xivada; shu yerdan yo'l tuzamizmi?",
  },
  {
    id: "oilaviy_poytaxt",
    name_uz: "Oilaviy poytaxt",
    aliases: ["oilaviy safari", "bolalar bilan", "family trip"],
    catalog_hubs: ["Toshkent", "Samarqand"],
    ask_first: true,
    mood: "family",
    typical_days: 3,
    guest_blurb_uz:
      "Oilaviy safar — Toshkent (metro, Magic City) yoki Samarqand. Qayerdan boshlaymiz?",
  },
];
