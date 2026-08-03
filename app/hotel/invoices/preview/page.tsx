"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { DEMO_INVOICE } from "../../mock-pack10";

type InvoiceLine = {
  name: string;
  description: string | null;
  quantity: number;
  unitPriceSom: number;
  lineTotalSom: number;
};

type Invoice = {
  id: string;
  number: string;
  status: string;
  clientName: string;
  clientAddress: string | null;
  clientCity: string | null;
  clientCountry: string | null;
  clientTin: string | null;
  project: string | null;
  terms: string | null;
  vatRateBps: number;
  subtotalSom: number;
  vatSom: number;
  totalSom: number;
  issuedAt: string | null;
  createdAt: string;
  lines: InvoiceLine[];
};

function formatSom(n: number): string {
  return `${n.toLocaleString("uz-UZ")} UZS`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Qoralama";
    case "ISSUED":
      return "Chiqarilgan";
    case "SENT":
      return "Yuborilgan";
    case "PAID":
      return "To‘langan";
    case "VOID":
      return "Bekor";
    default:
      return status;
  }
}

export default function InvoicePreviewPage() {
  return (
    <Suspense
      fallback={
        <p className="text-[13px] font-semibold text-[#64748B] p-6">
          Yuklanmoqda…
        </p>
      }
    >
      <InvoicePreviewInner />
    </Suspense>
  );
}

function InvoicePreviewInner() {
  const search = useSearchParams();
  const id = search.get("id");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hotel/invoices/${id}`);
        const data = (await res.json()) as {
          invoice?: Invoice;
          message?: string;
        };
        if (!res.ok || !data.invoice) {
          throw new Error(data.message || "Invoys topilmadi");
        }
        if (!cancelled) setInvoice(data.invoice);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Xatolik");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const vatRate = invoice
    ? invoice.vatRateBps / 100
    : DEMO_INVOICE.vatRate;
  const rows = invoice
    ? invoice.lines.map((l) => ({
        name: l.name,
        desc: l.description || "",
        qty: l.quantity,
        price: l.unitPriceSom,
        total: l.lineTotalSom,
      }))
    : [
        {
          name: "Deluxe Room Blocks",
          desc: "Standard corporate accommodation package",
          qty: 12,
          price: 1_200_000,
          total: 14_400_000,
        },
      ];
  const subtotal = invoice
    ? invoice.subtotalSom
    : rows.reduce((a, r) => a + r.total, 0);
  const vat = invoice ? invoice.vatSom : Math.round((subtotal * vatRate) / 100);
  const total = invoice ? invoice.totalSom : subtotal + vat;
  const number = invoice?.number ?? DEMO_INVOICE.number;
  const clientName = invoice?.clientName ?? DEMO_INVOICE.client.name;
  const clientCity = invoice?.clientCity ?? DEMO_INVOICE.client.city;
  const clientCountry =
    invoice?.clientCountry ?? DEMO_INVOICE.client.country;
  const clientTin = invoice?.clientTin ?? DEMO_INVOICE.client.stir;
  const clientAddress =
    invoice?.clientAddress ?? DEMO_INVOICE.client.address;
  const terms = invoice?.terms ?? DEMO_INVOICE.terms;
  const dateLabel = invoice?.issuedAt
    ? new Date(invoice.issuedAt).toLocaleDateString("uz-UZ")
    : invoice?.createdAt
      ? new Date(invoice.createdAt).toLocaleDateString("uz-UZ")
      : DEMO_INVOICE.dateLabel;
  const status = invoice ? statusLabel(invoice.status) : DEMO_INVOICE.status;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-16">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/hotel/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] text-[13px] font-bold text-[#64748B]"
        >
          <ArrowLeft size={16} />
          Orqaga qaytish
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#006781] text-white text-[13px] font-bold"
          >
            <Printer size={16} />
            Chop etish
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] text-[13px] font-bold text-[#0d2137]"
          >
            <Download size={16} />
            PDF yuklash
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-[13px] font-semibold text-[#64748B]">Yuklanmoqda…</p>
      ) : null}
      {error ? (
        <p className="text-[13px] font-semibold text-rose-600">{error}</p>
      ) : null}
      {!id && !loading ? (
        <p className="text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Demo ko‘rinish — yangi invoys yarating, yoki URL ga{" "}
          <code>?id=…</code> qo‘shing.
        </p>
      ) : null}

      <article className="bg-white border border-[#d8e3fb] rounded-2xl shadow-sm overflow-hidden print:border-0 print:shadow-none print:rounded-none">
        <div className="bg-[#0d2137] text-white px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.16em] text-[#8fdfff]">
              SafarTrip · Admin Terminal
            </div>
            <h1 className="font-display text-[32px] font-bold mt-1">INVOYS</h1>
            <div className="text-[14px] font-semibold text-white/80 mt-1">
              #{number}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[12px] font-semibold text-white/70">
              {dateLabel}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-400/20 text-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
              {status}
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-[#d8e3fb]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
              Yetkazib beruvchi
            </div>
            <div className="mt-2 text-[15px] font-bold text-[#0d2137]">
              {DEMO_INVOICE.supplier.name}
            </div>
            <p className="mt-1 text-[13px] font-semibold text-[#64748B] leading-relaxed">
              {DEMO_INVOICE.supplier.address}
              <br />
              {DEMO_INVOICE.supplier.city}
              <br />
              {DEMO_INVOICE.supplier.country}
            </p>
            <p className="mt-2 text-[12px] font-semibold text-[#006781]">
              {DEMO_INVOICE.supplier.email}
              <br />
              {DEMO_INVOICE.supplier.phone}
            </p>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
              Mijoz
            </div>
            <div className="mt-2 text-[15px] font-bold text-[#0d2137]">
              {clientName}
            </div>
            <p className="mt-1 text-[13px] font-semibold text-[#64748B] leading-relaxed">
              {clientAddress}
              <br />
              {clientCity}
              <br />
              {clientCountry}
            </p>
            <p className="mt-2 text-[12px] font-bold text-[#0d2137]">
              STIR: {clientTin || "—"}
            </p>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8] border-b border-[#d8e3fb]">
                <th className="py-2 pr-3">Xizmat nomi</th>
                <th className="py-2 px-3">Miqdori</th>
                <th className="py-2 px-3 text-right">Narxi</th>
                <th className="py-2 pl-3 text-right">Jami</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.name}-${r.qty}`} className="border-b border-[#eef2ff]">
                  <td className="py-3.5 pr-3">
                    <div className="text-[13px] font-bold text-[#111c2d]">
                      {r.name}
                    </div>
                    {r.desc ? (
                      <div className="text-[12px] font-semibold text-[#94A3B8]">
                        {r.desc}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3.5 px-3 text-[13px] font-bold text-[#64748B]">
                    {r.qty}
                  </td>
                  <td className="py-3.5 px-3 text-[13px] font-bold text-right">
                    {formatSom(r.price)}
                  </td>
                  <td className="py-3.5 pl-3 text-[13px] font-black text-right text-[#0d2137]">
                    {formatSom(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 sm:px-8 pb-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[#f9f9ff] border border-[#d8e3fb] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              To‘lov shartlari
            </div>
            <p className="mt-2 text-[13px] font-semibold text-[#475569] leading-relaxed">
              “{terms}”
            </p>
            <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Bank rekvizitlari
            </div>
            <p className="mt-2 text-[12px] font-semibold text-[#111c2d] leading-relaxed">
              Bank: {DEMO_INVOICE.bank.name}
              <br />
              IBAN: {DEMO_INVOICE.bank.iban}
              <br />
              SWIFT: {DEMO_INVOICE.bank.swift}
            </p>
          </div>
          <div className="rounded-xl border border-[#d8e3fb] p-4 space-y-2 text-[13px] font-semibold">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Subtotal</span>
              <span>{formatSom(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Soliq (VAT {vatRate}%)</span>
              <span>{formatSom(vat)}</span>
            </div>
            <div className="flex justify-between border-t border-[#d8e3fb] pt-3 text-[18px] font-black text-[#0d2137]">
              <span>Jami summa</span>
              <span>{formatSom(total)}</span>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
