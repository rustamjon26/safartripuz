import type { BookingStatus } from "@prisma/client";
import * as XLSX from "xlsx";
import type { HotelReports, ReportsGroupBy } from "@/lib/hotel/getHotelReports";

const MONEY_FMT = '#,##0" so\'m"';
const DATE_FMT = "DD.MM.YYYY";
const PERCENT_FMT = "0.0%";

const MONTHS_UZ = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
] as const;

const STATUS_UZ: Record<BookingStatus, string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Tasdiqlangan",
  CHECKED_IN: "Joylashgan",
  CHECKED_OUT: "Chiqib ketgan",
  CANCELLED: "Bekor qilingan",
  COMPLETED: "Yakunlangan",
  NO_SHOW: "Kelmadi",
};

const PAYMENT_UZ: Record<string, string> = {
  CASH: "Naqd",
  CARD: "Karta",
  TRANSFER: "O'tkazma",
  ONLINE: "Onlayn",
};

export type ReportExcelInput = {
  hotelName: string;
  report: HotelReports;
};

function formatPeriodLabel(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  return `Davr: ${sd} ${MONTHS_UZ[sm - 1]} — ${ed} ${MONTHS_UZ[em - 1]} ${ey}`;
}

function ymdToExcelSerial(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
}

function setCell(
  ws: XLSX.WorkSheet,
  ref: string,
  value: string | number,
  opts?: { numFmt?: string; formula?: string },
) {
  if (opts?.formula) {
    ws[ref] = { t: "n", f: opts.formula, z: opts.numFmt };
    return;
  }
  if (typeof value === "number") {
    ws[ref] = { t: "n", v: value, z: opts?.numFmt };
    return;
  }
  ws[ref] = { t: "s", v: value };
}

function applySheetMeta(
  ws: XLSX.WorkSheet,
  range: string,
  opts: {
    cols?: XLSX.ColInfo[];
    merges?: XLSX.Range[];
    freezeRow?: number;
    autofilter?: string;
  },
) {
  ws["!ref"] = range;
  if (opts.cols) ws["!cols"] = opts.cols;
  if (opts.merges) ws["!merges"] = opts.merges;
  if (opts.freezeRow) {
    ws["!views"] = [{ state: "frozen", ySplit: opts.freezeRow, activeCell: "A2" }];
  }
  if (opts.autofilter) {
    ws["!autofilter"] = { ref: opts.autofilter };
  }
}

function avgOccupancyForBucket(
  bucketDate: string,
  groupBy: ReportsGroupBy,
  periodEnd: string,
  occupancyChart: HotelReports["occupancy_chart"],
): number {
  const bucketStart = ymdToExcelSerial(bucketDate);
  let bucketEndExclusive: number;

  if (groupBy === "day") {
    bucketEndExclusive = bucketStart + 1;
  } else if (groupBy === "week") {
    bucketEndExclusive = bucketStart + 7;
  } else {
    const [y, m] = bucketDate.split("-").map(Number);
    const nextMonth = m === 12 ? Date.UTC(y + 1, 0, 1) : Date.UTC(y, m, 1);
    bucketEndExclusive = (nextMonth - Date.UTC(1899, 11, 30)) / 86400000;
  }

  const periodEndSerial = ymdToExcelSerial(periodEnd) + 1;
  const rates = occupancyChart
    .filter((row) => {
      const serial = ymdToExcelSerial(row.date);
      return serial >= bucketStart && serial < Math.min(bucketEndExclusive, periodEndSerial);
    })
    .map((row) => row.rate);

  if (rates.length === 0) return 0;
  return Math.round((rates.reduce((sum, rate) => sum + rate, 0) / rates.length) * 10) / 10;
}

function buildSummarySheet(report: HotelReports, hotelName: string): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  setCell(ws, "A1", "SafarTrip Hisoboti");
  setCell(ws, "A2", formatPeriodLabel(report.period.start, report.period.end));
  setCell(ws, "A3", hotelName);
  setCell(ws, "A4", "Ko'rsatkich");
  setCell(ws, "B4", "Qiymat");

  const rows: Array<[string, number, "money" | "count" | "percent"]> = [
    ["Jami daromad", report.summary.total_revenue, "money"],
    ["Jami bronlar", report.summary.total_bookings, "count"],
    ["Jami tunlar", report.summary.total_nights, "count"],
    ["O'rtacha kunlik tarif", report.summary.avg_daily_rate, "money"],
    ["Band bo'lish darajasi", report.summary.occupancy_rate, "percent"],
    ["Yangi mehmonlar", report.summary.new_guests, "count"],
    ["Qaytib kelgan", report.summary.returning_guests, "count"],
  ];

  rows.forEach(([label, value], index) => {
    const row = 5 + index;
    setCell(ws, `A${row}`, label);
    if (value === report.summary.occupancy_rate) {
      setCell(ws, `B${row}`, value / 100, { numFmt: PERCENT_FMT });
    } else if (index === 0 || index === 3) {
      setCell(ws, `B${row}`, value, { numFmt: MONEY_FMT });
    } else {
      setCell(ws, `B${row}`, value);
    }
  });

  applySheetMeta(ws, "A1:B11", {
    merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }],
    cols: [{ wch: 28 }, { wch: 22 }],
    freezeRow: 4,
    autofilter: "A4:B11",
  });

  return ws;
}

function buildDailyRevenueSheet(report: HotelReports): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  setCell(ws, "A1", "Sana");
  setCell(ws, "B1", "Daromad (so'm)");
  setCell(ws, "C1", "Bronlar soni");
  setCell(ws, "D1", "Band bo'lish (%)");

  const dataRows = report.revenue_chart.length;
  report.revenue_chart.forEach((row, index) => {
    const excelRow = index + 2;
    const occupancy = avgOccupancyForBucket(
      row.date,
      report.period.group_by,
      report.period.end,
      report.occupancy_chart,
    );

    setCell(ws, `A${excelRow}`, ymdToExcelSerial(row.date), { numFmt: DATE_FMT });
    setCell(ws, `B${excelRow}`, row.revenue, { numFmt: MONEY_FMT });
    setCell(ws, `C${excelRow}`, row.bookings);
    setCell(ws, `D${excelRow}`, occupancy / 100, { numFmt: PERCENT_FMT });
  });

  const totalRow = dataRows + 2;
  if (dataRows > 0) {
    setCell(ws, `A${totalRow}`, "JAMI");
    setCell(ws, `B${totalRow}`, 0, {
      formula: `SUM(B2:B${dataRows + 1})`,
      numFmt: MONEY_FMT,
    });
    setCell(ws, `C${totalRow}`, 0, { formula: `SUM(C2:C${dataRows + 1})` });
    setCell(ws, `D${totalRow}`, 0, {
      formula: `AVERAGE(D2:D${dataRows + 1})`,
      numFmt: PERCENT_FMT,
    });
  }

  const lastRow = Math.max(totalRow, 1);
  applySheetMeta(ws, `A1:D${lastRow}`, {
    cols: [{ wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }],
    freezeRow: 1,
    autofilter: dataRows > 0 ? `A1:D${dataRows + 1}` : "A1:D1",
  });

  return ws;
}

function buildBookingsSheet(report: HotelReports): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const headers = [
    "№",
    "Mehmon",
    "Telefon",
    "Xona",
    "Xona turi",
    "Kirish",
    "Chiqish",
    "Tunlar",
    "Summa",
    "Holat",
    "To'lov usuli",
  ];

  headers.forEach((header, col) => {
    setCell(ws, `${XLSX.utils.encode_col(col)}1`, header);
  });

  report.bookings_detail.forEach((row, index) => {
    const excelRow = index + 2;
    setCell(ws, `A${excelRow}`, index + 1);
    setCell(ws, `B${excelRow}`, row.guest_name);
    setCell(ws, `C${excelRow}`, row.guest_phone ?? "—");
    setCell(ws, `D${excelRow}`, row.room_number ?? "—");
    setCell(ws, `E${excelRow}`, row.room_type ?? "—");
    setCell(ws, `F${excelRow}`, ymdToExcelSerial(row.check_in), { numFmt: DATE_FMT });
    setCell(ws, `G${excelRow}`, ymdToExcelSerial(row.check_out), { numFmt: DATE_FMT });
    setCell(ws, `H${excelRow}`, row.nights);
    setCell(ws, `I${excelRow}`, row.total_amount, { numFmt: MONEY_FMT });
    setCell(ws, `J${excelRow}`, STATUS_UZ[row.status] ?? row.status);
    setCell(
      ws,
      `K${excelRow}`,
      PAYMENT_UZ[row.payment_method] ?? row.payment_method,
    );
  });

  const dataRows = report.bookings_detail.length;
  const totalRow = dataRows + 2;
  if (dataRows > 0) {
    setCell(ws, `A${totalRow}`, "JAMI");
    setCell(ws, `I${totalRow}`, 0, {
      formula: `SUM(I2:I${dataRows + 1})`,
      numFmt: MONEY_FMT,
    });
  }

  const lastRow = Math.max(totalRow, 1);
  applySheetMeta(ws, `A1:K${lastRow}`, {
    cols: [
      { wch: 5 },
      { wch: 22 },
      { wch: 16 },
      { wch: 10 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
    ],
    freezeRow: 1,
    autofilter: dataRows > 0 ? `A1:K${dataRows + 1}` : "A1:K1",
  });

  return ws;
}

function buildRoomTypesSheet(report: HotelReports): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const headers = ["Xona turi", "Bronlar", "Daromad", "O'rtacha band (%)"];
  headers.forEach((header, col) => {
    setCell(ws, `${XLSX.utils.encode_col(col)}1`, header);
  });

  report.room_type_breakdown.forEach((row, index) => {
    const excelRow = index + 2;
    setCell(ws, `A${excelRow}`, row.room_type);
    setCell(ws, `B${excelRow}`, row.bookings);
    setCell(ws, `C${excelRow}`, row.revenue, { numFmt: MONEY_FMT });
    setCell(ws, `D${excelRow}`, row.avg_occupancy / 100, { numFmt: PERCENT_FMT });
  });

  const dataRows = report.room_type_breakdown.length;
  const lastRow = Math.max(dataRows + 1, 1);
  applySheetMeta(ws, `A1:D${lastRow}`, {
    cols: [{ wch: 22 }, { wch: 12 }, { wch: 20 }, { wch: 18 }],
    freezeRow: 1,
    autofilter: dataRows > 0 ? `A1:D${dataRows + 1}` : "A1:D1",
  });

  return ws;
}

export function buildReportExcelFilename(endDate: string): string {
  const [year, month] = endDate.split("-");
  return `safartrip-hisobot-${year}-${month}.xlsx`;
}

export function generateReportExcel(input: ReportExcelInput): Buffer {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildSummarySheet(input.report, input.hotelName), "Xulosa");
  XLSX.utils.book_append_sheet(wb, buildDailyRevenueSheet(input.report), "Kunlik daromad");
  XLSX.utils.book_append_sheet(wb, buildBookingsSheet(input.report), "Bronlar ro'yxati");
  XLSX.utils.book_append_sheet(wb, buildRoomTypesSheet(input.report), "Xona turlari");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}
