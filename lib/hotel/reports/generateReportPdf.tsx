import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { HotelReports } from "@/lib/hotel/getHotelReports";

const PRIMARY = "#2563eb";
const ROW_EVEN = "#f8fafc";
const ROW_ODD = "#ffffff";
const MAX_BOOKINGS = 500;
const BOOKINGS_PER_PAGE = 26;

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

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: "#1e293b",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#64748b",
  },
  brand: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    marginBottom: 8,
  },
  hotelName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  meta: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    marginTop: 18,
    marginBottom: 10,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    fontSize: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 5,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  summaryItem: {
    width: "50%",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  summaryLabel: {
    width: "55%",
    padding: 8,
    backgroundColor: ROW_EVEN,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  summaryValue: {
    width: "45%",
    padding: 8,
    fontSize: 9,
  },
  overflowNote: {
    marginTop: 10,
    fontSize: 9,
    color: "#64748b",
    fontStyle: "italic",
  },
});

export type ReportPdfInput = {
  hotelName: string;
  report: HotelReports;
  generatedAt: Date;
};

function formatPeriodDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS_UZ[m - 1]} ${y}`;
}

function formatCreatedAt(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

function formatShortDate(ymd: string) {
  const [, m, d] = ymd.split("-").map(Number);
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function PageFooter() {
  return (
    <Text
      style={styles.footer}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      fixed
    />
  );
}

function SummarySection({ report }: { report: HotelReports }) {
  const items = [
    { label: "Jami daromad", value: formatMoney(report.summary.total_revenue) },
    { label: "Jami bronlar", value: `${report.summary.total_bookings} ta` },
    { label: "Jami tunlar", value: `${report.summary.total_nights} tun` },
    { label: "O'rtacha tarif", value: formatMoney(report.summary.avg_daily_rate) },
    { label: "Band bo'lish", value: `${report.summary.occupancy_rate}%` },
    { label: "Yangi mehmonlar", value: `${report.summary.new_guests} ta` },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Xulosa</Text>
      <View style={styles.summaryGrid}>
        {items.map((item, index) => (
          <View
            key={item.label}
            style={[
              styles.summaryItem,
              { backgroundColor: index % 2 === 0 ? ROW_EVEN : ROW_ODD },
            ]}
          >
            <Text style={styles.summaryLabel}>{item.label}</Text>
            <Text style={styles.summaryValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RoomTypeTable({ report }: { report: HotelReports }) {
  const colWidths = ["30%", "17%", "28%", "25%"];

  return (
    <View>
      <Text style={styles.sectionTitle}>Xona turi tahlili</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          {["Xona turi", "Bronlar", "Daromad", "O'rtacha band bo'lish"].map((col, i) => (
            <Text key={col} style={[styles.cell, { width: colWidths[i] }]}>
              {col}
            </Text>
          ))}
        </View>
        {report.room_type_breakdown.length === 0 ? (
          <View style={[styles.tableRow, { backgroundColor: ROW_EVEN }]}>
            <Text style={[styles.cell, { width: "100%" }]}>Ma'lumot yo'q</Text>
          </View>
        ) : (
          report.room_type_breakdown.map((row, index) => (
            <View
              key={row.room_type}
              style={[
                styles.tableRow,
                { backgroundColor: index % 2 === 0 ? ROW_EVEN : ROW_ODD },
              ]}
            >
              <Text style={[styles.cell, { width: colWidths[0] }]}>{row.room_type}</Text>
              <Text style={[styles.cell, { width: colWidths[1] }]}>{row.bookings}</Text>
              <Text style={[styles.cell, { width: colWidths[2] }]}>{formatMoney(row.revenue)}</Text>
              <Text style={[styles.cell, { width: colWidths[3] }]}>{row.avg_occupancy}%</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function BookingsTable({
  rows,
  startIndex,
  showTitle,
  overflowCount,
  isLastChunk,
}: {
  rows: HotelReports["bookings_detail"];
  startIndex: number;
  showTitle: boolean;
  overflowCount: number;
  isLastChunk: boolean;
}) {
  const colWidths = ["5%", "22%", "10%", "12%", "12%", "9%", "18%", "12%"];

  return (
    <View>
      {showTitle && <Text style={styles.sectionTitle}>Bronlar tafsiloti</Text>}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          {["№", "Mehmon", "Xona", "Kirish", "Chiqish", "Tunlar", "Summa", "Holat"].map(
            (col, i) => (
              <Text key={col} style={[styles.cell, { width: colWidths[i] }]}>
                {col}
              </Text>
            ),
          )}
        </View>
        {rows.map((row, index) => (
          <View
            key={row.booking_id}
            style={[
              styles.tableRow,
              { backgroundColor: index % 2 === 0 ? ROW_EVEN : ROW_ODD },
            ]}
          >
            <Text style={[styles.cell, { width: colWidths[0] }]}>{startIndex + index + 1}</Text>
            <Text style={[styles.cell, { width: colWidths[1] }]}>{row.guest_name}</Text>
            <Text style={[styles.cell, { width: colWidths[2] }]}>
              {row.room_number ?? "—"}
            </Text>
            <Text style={[styles.cell, { width: colWidths[3] }]}>
              {formatShortDate(row.check_in)}
            </Text>
            <Text style={[styles.cell, { width: colWidths[4] }]}>
              {formatShortDate(row.check_out)}
            </Text>
            <Text style={[styles.cell, { width: colWidths[5] }]}>{row.nights}</Text>
            <Text style={[styles.cell, { width: colWidths[6] }]}>
              {formatMoney(row.total_amount)}
            </Text>
            <Text style={[styles.cell, { width: colWidths[7] }]}>{row.status}</Text>
          </View>
        ))}
      </View>
      {isLastChunk && overflowCount > 0 && (
        <Text style={styles.overflowNote}>va yana {overflowCount} ta bron</Text>
      )}
    </View>
  );
}

function TopGuestsTable({ report }: { report: HotelReports }) {
  const colWidths = ["8%", "42%", "20%", "30%"];

  return (
    <View>
      <Text style={styles.sectionTitle}>Top mehmonlar</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          {["№", "Ism", "Tashriflar", "Jami xarajat"].map((col, i) => (
            <Text key={col} style={[styles.cell, { width: colWidths[i] }]}>
              {col}
            </Text>
          ))}
        </View>
        {report.top_guests.length === 0 ? (
          <View style={[styles.tableRow, { backgroundColor: ROW_EVEN }]}>
            <Text style={[styles.cell, { width: "100%" }]}>Ma'lumot yo'q</Text>
          </View>
        ) : (
          report.top_guests.map((guest, index) => (
            <View
              key={guest.guest_id}
              style={[
                styles.tableRow,
                { backgroundColor: index % 2 === 0 ? ROW_EVEN : ROW_ODD },
              ]}
            >
              <Text style={[styles.cell, { width: colWidths[0] }]}>{index + 1}</Text>
              <Text style={[styles.cell, { width: colWidths[1] }]}>{guest.name}</Text>
              <Text style={[styles.cell, { width: colWidths[2] }]}>{guest.visits}</Text>
              <Text style={[styles.cell, { width: colWidths[3] }]}>
                {formatMoney(guest.total_spent)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function ReportPdfDocument({ hotelName, report, generatedAt }: ReportPdfInput) {
  const allBookings = report.bookings_detail;
  const displayedBookings = allBookings.slice(0, MAX_BOOKINGS);
  const overflowCount = Math.max(0, allBookings.length - MAX_BOOKINGS);
  const bookingChunks = chunk(displayedBookings, BOOKINGS_PER_PAGE);
  const chunks =
    bookingChunks.length > 0 ? bookingChunks : [[] as HotelReports["bookings_detail"]];

  return (
    <Document
      title={`SafarTrip hisobot — ${hotelName}`}
      author="SafarTrip"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>SafarTrip</Text>
        <Text style={styles.hotelName}>{hotelName}</Text>
        <Text style={styles.meta}>
          Hisobot davri: {formatPeriodDate(report.period.start)} —{" "}
          {formatPeriodDate(report.period.end)}
        </Text>
        <Text style={styles.meta}>Yaratilgan: {formatCreatedAt(generatedAt)}</Text>

        <SummarySection report={report} />
        <RoomTypeTable report={report} />
        <PageFooter />
      </Page>

      {chunks.map((rows, chunkIndex) => (
        <Page key={`bookings-${chunkIndex}`} size="A4" style={styles.page}>
          <BookingsTable
            rows={rows}
            startIndex={chunkIndex * BOOKINGS_PER_PAGE}
            showTitle={chunkIndex === 0}
            overflowCount={overflowCount}
            isLastChunk={chunkIndex === chunks.length - 1}
          />
          <PageFooter />
        </Page>
      ))}

      <Page size="A4" style={styles.page}>
        <TopGuestsTable report={report} />
        <PageFooter />
      </Page>
    </Document>
  );
}

export async function generateReportPdf(input: ReportPdfInput): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <ReportPdfDocument
      hotelName={input.hotelName}
      report={input.report}
      generatedAt={input.generatedAt}
    />,
  );
  return Buffer.from(buffer);
}

export function buildReportPdfFilename(endDate: string): string {
  const [year, month] = endDate.split("-");
  return `safartrip-report-${year}-${month}.pdf`;
}
