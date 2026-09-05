/**
 * Classic multi-stop itineraries (section 4). Do not invent hotels on a stop.
 */

export type UzRoute = {
  id: string;
  name_uz: string;
  aliases: string[];
  days: number;
  stops: string[];
  guest_blurb_uz: string;
};

export const UZ_ROUTES: UzRoute[] = [
  {
    id: "classic_silk",
    name_uz: "Klassik Ipak yo'li",
    aliases: [
      "ipak yoli marshruti",
      "klassik marshrut",
      "samarqand buxoro xiva",
      "toshkent samarqand buxoro",
    ],
    days: 8,
    stops: ["Toshkent", "Samarqand", "Buxoro", "Xiva"],
    guest_blurb_uz:
      "Klassik yo'l: Toshkent → Samarqand → Buxoro → Xiva, 7–9 kun. Qaysi shahardan boshlaymiz?",
  },
  {
    id: "short_silk",
    name_uz: "Qisqa Ipak yo'li",
    aliases: ["samarqand buxoro", "ikki shahar", "qisqa ipak"],
    days: 5,
    stops: ["Samarqand", "Buxoro"],
    guest_blurb_uz:
      "5 kun: Samarqand va Buxoro. Poyezd qulay. Qaysi shaharda tunaymiz avval?",
  },
  {
    id: "weekend_tog",
    name_uz: "Dam olish: tog'",
    aliases: ["weekend tog", "2 kun tog", "dam olish tog"],
    days: 2,
    stops: ["Zomin", "Toshkent"],
    guest_blurb_uz:
      "Ikki kun tog': Zomin yoki Chimyon/Chorvoq. Qaysi havo yoqadi — archa yoki chang'i?",
  },
  {
    id: "temur_south",
    name_uz: "Temur vatani",
    aliases: ["shahrisabz safari", "temur vatani", "oqsaroy safari"],
    days: 2,
    stops: ["Samarqand"],
    guest_blurb_uz:
      "Shahrisabz — Oqsaroy, Samarqanddan Taxtaqoracha orqali. Tunash uchun Samarqand qulay.",
  },
  {
    id: "xorazm_orol",
    name_uz: "Xorazm va Orol",
    aliases: ["xiva moynoq", "orol safari", "nukus savitskiy"],
    days: 4,
    stops: ["Xiva"],
    guest_blurb_uz:
      "Xiva + Nukus/Mo'ynoq: Ichan-Qal'a, Savitskiy, kemalar. Mehmonxona hozir Xivada.",
  },
];
