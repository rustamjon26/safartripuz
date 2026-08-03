import { NextResponse } from "next/server";
import {
  createInvoiceSchema,
  invoiceService,
  listInvoicesQuerySchema,
} from "@/src/modules/invoice";
import { mapHotelOpsError, requireHotelOps } from "../_ops-utils";

export async function GET(req: Request) {
  try {
    const { hotelId } = await requireHotelOps();
    const url = new URL(req.url);
    const parsed = listInvoicesQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? "all",
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid query" }, { status: 400 });
    }
    const items = await invoiceService.list(hotelId, parsed.data);
    return NextResponse.json({ items });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor, hotelId } = await requireHotelOps();
    const body: unknown = await req.json();
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.message },
        { status: 400 },
      );
    }
    const invoice = await invoiceService.create({
      hotelId,
      createdByUserId: actor.id,
      bookingId: parsed.data.bookingId,
      clientName: parsed.data.clientName,
      clientAddress: parsed.data.clientAddress,
      clientCity: parsed.data.clientCity,
      clientCountry: parsed.data.clientCountry,
      clientTin: parsed.data.clientTin,
      project: parsed.data.project,
      terms: parsed.data.terms,
      notes: parsed.data.notes,
      vatRateBps: parsed.data.vatRateBps,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
      lines: parsed.data.lines,
      issue: parsed.data.issue,
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}
