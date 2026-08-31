import { prisma } from "@/src/shared/db/prisma";
import type { HotelInvoiceStatus, InvoiceView } from "../domain/types";
import { tiyinToSomNumber } from "../domain/money-calc";

function mapLine(row: {
  id: string;
  sortOrder: number;
  name: string;
  description: string | null;
  quantity: number;
  unitPriceTiyin: bigint;
  lineTotalTiyin: bigint;
}) {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    name: row.name,
    description: row.description,
    quantity: row.quantity,
    unitPriceTiyin: row.unitPriceTiyin.toString(),
    lineTotalTiyin: row.lineTotalTiyin.toString(),
    unitPriceSom: tiyinToSomNumber(row.unitPriceTiyin),
    lineTotalSom: tiyinToSomNumber(row.lineTotalTiyin),
  };
}

function mapInvoice(row: {
  id: string;
  hotelId: string;
  number: string;
  status: HotelInvoiceStatus;
  bookingId: string | null;
  clientName: string;
  clientAddress: string | null;
  clientCity: string | null;
  clientCountry: string | null;
  clientTin: string | null;
  project: string | null;
  terms: string | null;
  notes: string | null;
  currency: string;
  vatRateBps: number;
  subtotalTiyin: bigint;
  vatTiyin: bigint;
  totalTiyin: bigint;
  issuedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  didoxDocumentId: string | null;
  createdAt: Date;
  lines: Array<{
    id: string;
    sortOrder: number;
    name: string;
    description: string | null;
    quantity: number;
    unitPriceTiyin: bigint;
    lineTotalTiyin: bigint;
  }>;
}): InvoiceView {
  return {
    id: row.id,
    hotelId: row.hotelId,
    number: row.number,
    status: row.status,
    bookingId: row.bookingId,
    clientName: row.clientName,
    clientAddress: row.clientAddress,
    clientCity: row.clientCity,
    clientCountry: row.clientCountry,
    clientTin: row.clientTin,
    project: row.project,
    terms: row.terms,
    notes: row.notes,
    currency: row.currency,
    vatRateBps: row.vatRateBps,
    subtotalTiyin: row.subtotalTiyin.toString(),
    vatTiyin: row.vatTiyin.toString(),
    totalTiyin: row.totalTiyin.toString(),
    subtotalSom: tiyinToSomNumber(row.subtotalTiyin),
    vatSom: tiyinToSomNumber(row.vatTiyin),
    totalSom: tiyinToSomNumber(row.totalTiyin),
    issuedAt: row.issuedAt?.toISOString() ?? null,
    dueAt: row.dueAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    didoxDocumentId: row.didoxDocumentId,
    createdAt: row.createdAt.toISOString(),
    lines: row.lines
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapLine),
  };
}

export const invoiceRepository = {
  async nextNumber(hotelId: string, year: number): Promise<string> {
    const prefix = `INV-${year}-`;
    const last = await prisma.hotelInvoice.findFirst({
      where: { hotelId, number: { startsWith: prefix } },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    let seq = 1;
    if (last?.number) {
      const part = last.number.slice(prefix.length);
      const n = Number.parseInt(part, 10);
      if (Number.isFinite(n)) seq = n + 1;
    }
    return `${prefix}${String(seq).padStart(4, "0")}`;
  },

  async create(input: {
    hotelId: string;
    number: string;
    status: HotelInvoiceStatus;
    bookingId?: string;
    clientName: string;
    clientAddress?: string;
    clientCity?: string;
    clientCountry?: string;
    clientTin?: string;
    project?: string;
    terms?: string;
    notes?: string;
    vatRateBps: number;
    subtotalTiyin: bigint;
    vatTiyin: bigint;
    totalTiyin: bigint;
    dueAt?: Date;
    issuedAt?: Date;
    createdByUserId?: string;
    lines: Array<{
      sortOrder: number;
      name: string;
      description?: string;
      quantity: number;
      unitPriceTiyin: bigint;
      lineTotalTiyin: bigint;
    }>;
  }): Promise<InvoiceView> {
    const row = await prisma.hotelInvoice.create({
      data: {
        hotelId: input.hotelId,
        number: input.number,
        status: input.status,
        bookingId: input.bookingId,
        clientName: input.clientName,
        clientAddress: input.clientAddress,
        clientCity: input.clientCity,
        clientCountry: input.clientCountry,
        clientTin: input.clientTin,
        project: input.project,
        terms: input.terms,
        notes: input.notes,
        vatRateBps: input.vatRateBps,
        subtotalTiyin: input.subtotalTiyin,
        vatTiyin: input.vatTiyin,
        totalTiyin: input.totalTiyin,
        dueAt: input.dueAt,
        issuedAt: input.issuedAt,
        createdByUserId: input.createdByUserId,
        lines: {
          create: input.lines.map((l) => ({
            sortOrder: l.sortOrder,
            name: l.name,
            description: l.description,
            quantity: l.quantity,
            unitPriceTiyin: l.unitPriceTiyin,
            lineTotalTiyin: l.lineTotalTiyin,
          })),
        },
      },
      include: { lines: true },
    });
    return mapInvoice(row);
  },

  async get(hotelId: string, id: string): Promise<InvoiceView | null> {
    const row = await prisma.hotelInvoice.findFirst({
      where: { id, hotelId },
      include: { lines: true },
    });
    return row ? mapInvoice(row) : null;
  },

  async list(
    hotelId: string,
    opts: { status?: HotelInvoiceStatus | "all"; limit: number },
  ): Promise<InvoiceView[]> {
    const rows = await prisma.hotelInvoice.findMany({
      where: {
        hotelId,
        ...(opts.status && opts.status !== "all"
          ? { status: opts.status }
          : {}),
      },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: opts.limit,
    });
    return rows.map(mapInvoice);
  },

  async updateStatus(
    hotelId: string,
    id: string,
    status: HotelInvoiceStatus,
    stamps: { issuedAt?: Date; paidAt?: Date },
  ): Promise<InvoiceView | null> {
    const existing = await prisma.hotelInvoice.findFirst({
      where: { id, hotelId },
      select: { id: true },
    });
    if (!existing) return null;
    const row = await prisma.hotelInvoice.update({
      where: { id },
      data: {
        status,
        ...(stamps.issuedAt ? { issuedAt: stamps.issuedAt } : {}),
        ...(stamps.paidAt ? { paidAt: stamps.paidAt } : {}),
      },
      include: { lines: true },
    });
    return mapInvoice(row);
  },
};
