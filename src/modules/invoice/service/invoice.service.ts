import { computeInvoiceTotals } from "../domain/money-calc";
import {
  assertInvoiceTransition,
  InvoiceStatusError,
} from "../domain/status";
import { createInvoiceSchema, patchInvoiceStatusSchema } from "../domain/validate";
import type {
  CreateInvoiceInput,
  HotelInvoiceStatus,
  InvoiceView,
} from "../domain/types";
import { invoiceRepository } from "../repository/invoice.repository";

export class InvoiceNotFoundError extends Error {
  constructor(message = "Invoys topilmadi") {
    super(message);
    this.name = "InvoiceNotFoundError";
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code?: unknown }).code) : "";
  // Prisma P2002 = unique constraint failed
  return code === "P2002";
}

export class InvoiceService {
  async create(raw: CreateInvoiceInput): Promise<InvoiceView> {
    const parsed = createInvoiceSchema.safeParse({
      bookingId: raw.bookingId,
      clientName: raw.clientName,
      clientAddress: raw.clientAddress,
      clientCity: raw.clientCity,
      clientCountry: raw.clientCountry,
      clientTin: raw.clientTin,
      project: raw.project,
      terms: raw.terms,
      notes: raw.notes,
      vatRateBps: raw.vatRateBps,
      dueAt: raw.dueAt?.toISOString(),
      lines: raw.lines,
      issue: raw.issue,
    });
    if (!parsed.success) {
      throw new Error(`Invalid invoice: ${parsed.error.message}`);
    }
    const data = parsed.data;
    const vatRateBps = data.vatRateBps ?? 800;
    const totals = computeInvoiceTotals(data.lines, vatRateBps);
    const year = new Date().getFullYear();
    const issue = Boolean(data.issue);
    const status: HotelInvoiceStatus = issue ? "ISSUED" : "DRAFT";

    // nextNumber is a separate read — retry on unique collision under concurrency.
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const number = await invoiceRepository.nextNumber(raw.hotelId, year);
      try {
        return await invoiceRepository.create({
          hotelId: raw.hotelId,
          number,
          status,
          bookingId: data.bookingId,
          clientName: data.clientName,
          clientAddress: data.clientAddress,
          clientCity: data.clientCity,
          clientCountry: data.clientCountry,
          clientTin: data.clientTin,
          project: data.project,
          terms: data.terms,
          notes: data.notes,
          vatRateBps,
          subtotalTiyin: totals.subtotalTiyin,
          vatTiyin: totals.vatTiyin,
          totalTiyin: totals.totalTiyin,
          dueAt: data.dueAt ? new Date(data.dueAt) : raw.dueAt,
          issuedAt: issue ? new Date() : undefined,
          createdByUserId: raw.createdByUserId,
          lines: totals.lines.map((l, i) => ({
            sortOrder: i,
            name: l.name,
            description: l.description,
            quantity: l.quantity,
            unitPriceTiyin: l.unitPriceTiyin,
            lineTotalTiyin: l.lineTotalTiyin,
          })),
        });
      } catch (err) {
        lastError = err;
        if (!isUniqueConstraintError(err)) throw err;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Invoys raqami band — qayta urinib ko‘ring");
  }

  async get(hotelId: string, id: string): Promise<InvoiceView> {
    const inv = await invoiceRepository.get(hotelId, id);
    if (!inv) throw new InvoiceNotFoundError();
    return inv;
  }

  async list(
    hotelId: string,
    opts: { status?: HotelInvoiceStatus | "all"; limit?: number } = {},
  ): Promise<InvoiceView[]> {
    return invoiceRepository.list(hotelId, {
      status: opts.status ?? "all",
      limit: opts.limit ?? 50,
    });
  }

  async transition(
    hotelId: string,
    id: string,
    rawStatus: unknown,
  ): Promise<InvoiceView> {
    const parsed = patchInvoiceStatusSchema.safeParse({ status: rawStatus });
    if (!parsed.success) {
      throw new Error(`Invalid status: ${parsed.error.message}`);
    }
    const current = await invoiceRepository.get(hotelId, id);
    if (!current) throw new InvoiceNotFoundError();
    const next = parsed.data.status;
    assertInvoiceTransition(current.status, next);
    const stamps: { issuedAt?: Date; paidAt?: Date } = {};
    if (next === "ISSUED" && !current.issuedAt) stamps.issuedAt = new Date();
    if (next === "PAID") stamps.paidAt = new Date();
    const updated = await invoiceRepository.updateStatus(
      hotelId,
      id,
      next,
      stamps,
    );
    if (!updated) throw new InvoiceNotFoundError();
    return updated;
  }
}

export const invoiceService = new InvoiceService();
export { InvoiceStatusError };
