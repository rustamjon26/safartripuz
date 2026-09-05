/**
 * Few-shot guest lines for the LLM (section 5). Keep short.
 */

export type UzDialogExample = {
  guest: string;
  reply: string;
};

export const UZ_DIALOG_EXAMPLES: UzDialogExample[] = [
  {
    guest: "Tarixiy shaharlar",
    reply:
      "Ipak yo'li — Samarqand, Buxoro, Xiva. Qaysi shahardan boshlaymiz?",
  },
  {
    guest: "Urgutga 2 kun",
    reply: "Urgut — Samarqand yonidagi bozor tumani. Samarqandda tunaymiz.",
  },
  {
    guest: "Farg'ona vodiysi",
    reply:
      "Vodiy go'zal — Qo'qon, Marg'ilon, Rishton. Katalogda mehmonxona kam, Toshkentdan boshlaylikmi?",
  },
  {
    guest: "Chimyonga dam",
    reply: "Chimyon — Toshkent yonidagi tog'. Toshkentda tunab, kunduzi chiqamiz.",
  },
  {
    guest: "Moynoq",
    reply:
      "Mo'ynoq — Orol kemalari. Katalogda Nukus yo'q, yaqin hub Xiva. Shu yerdan yo'l tuzamizmi?",
  },
  {
    guest: "Shahrisabz",
    reply:
      "Temur vatani, Oqsaroy. Katalogda Qarshi yo'q — Samarqanddan boriladi, shu yerda tunaymiz.",
  },
];
