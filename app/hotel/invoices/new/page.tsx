"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { INVOICE_LINE_PRESETS } from "../../mock-pack10";
import { hotelFetch } from "@/app/hotel/_lib/hotelFetch";

type Line = { id: string; name: string; qty: number; price: number };

const STEPS = ["Mijoz", "Xizmatlar", "Shartlar", "Ko‘rib chiqish"] as const;
/** Default VAT % for new invoices (8%). */
const VAT_RATE = 8;

function formatSom(n: number): string {
  return `${n.toLocaleString("uz-UZ")} UZS`;
}

export default function InvoiceWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  // Empty defaults — never ship DEMO client/TIN into a real B2B invoice.
  const [clientName, setClientName] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientTin, setClientTin] = useState("");
  const [project, setProject] = useState("");
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { id: "l0", name: "", qty: 1, price: 0 },
  ]);

  const subtotal = useMemo(
    () => lines.reduce((acc, l) => acc + l.qty * l.price, 0),
    [lines],
  );
  const vat = Math.round((subtotal * VAT_RATE) / 100);
  const total = subtotal + vat;

  function addLine() {
    const preset = INVOICE_LINE_PRESETS[lines.length % INVOICE_LINE_PRESETS.length];
    setLines((prev) => [
      ...prev,
      {
        id: `l${Date.now()}`,
        name: preset.name,
        qty: 1,
        price: preset.price,
      },
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  async function finish() {
    if (saving) return;
    const validLines = lines.filter(
      (l) => l.name.trim() && l.qty > 0 && l.price > 0,
    );
    if (!clientName.trim() || validLines.length === 0) {
      toast.error("Mijoz va kamida 1 ta to‘liq xizmat (nom, miqdor, narx) kerak");
      return;
    }
    setSaving(true);
    try {
      const res = await hotelFetch("/api/hotel/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientCity: clientCity.trim() || undefined,
          clientTin: clientTin.trim() || undefined,
          project: project.trim() || undefined,
          terms: terms.trim() || undefined,
          notes: notes.trim() || undefined,
          vatRateBps: VAT_RATE * 100,
          issue: true,
          lines: validLines.map((l) => ({
            name: l.name.trim(),
            quantity: l.qty,
            unitPriceSom: l.price,
          })),
        }),
      });
      const data = (await res.json()) as {
        invoice?: { id: string };
        message?: string;
      };
      if (!res.ok || !data.invoice) {
        throw new Error(data.message || "Invoys saqlanmadi");
      }
      // ISSUED → SENT for "yuborish"
      const sendRes = await hotelFetch(`/api/hotel/invoices/${data.invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });
      const sendData = (await sendRes.json()) as { message?: string };
      if (!sendRes.ok) {
        throw new Error(
          sendData.message ||
            "Invoys yaratildi, lekin yuborish (SENT) muvaffaqiyatsiz",
        );
      }
      toast.success("Invoys yaratildi va yuborildi");
      router.push(`/hotel/invoices/preview?id=${data.invoice.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            Billing & Invoicing
          </div>
          <h1 className="font-display text-[28px] font-bold text-[#0d2137] mt-1">
            Invoys yaratish
          </h1>
          <p className="text-[13px] font-semibold text-[#64748B] mt-1">
            B2B invoys — summalar tiyin sifatida saqlanadi, status: DRAFT→ISSUED→SENT.
          </p>
        </div>
        <Link
          href="/hotel/finance"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] text-[13px] font-bold text-[#64748B]"
        >
          <ArrowLeft size={16} />
          Moliya
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`px-3.5 py-2 rounded-full text-[12px] font-[family-name:var(--font-sora)] font-bold ${
              step === i
                ? "bg-[#0d2137] text-white"
                : step > i
                  ? "bg-[#b9eaff] text-[#001f29]"
                  : "bg-white border border-[#d8e3fb] text-[#64748B]"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-[#d8e3fb] rounded-2xl p-5 sm:p-6">
          {step === 0 ? (
            <div className="space-y-4">
              <h2 className="font-display text-[20px] font-bold text-[#0d2137]">
                Mijoz
              </h2>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Kompaniya / mijoz
                </span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-4 py-3 text-[13px] font-bold"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Manzil
                </span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-4 py-3 text-[13px] font-bold"
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  STIR
                </span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-4 py-3 text-[13px] font-bold"
                  value={clientTin}
                  onChange={(e) => setClientTin(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Loyiha
                </span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-4 py-3 text-[13px] font-bold"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                />
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-[20px] font-bold text-[#0d2137]">
                  Xizmatlarni qo‘shish
                </h2>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#b9eaff] text-[#001f29] text-[12px] font-bold"
                >
                  <Plus size={14} />
                  Yangi qator
                </button>
              </div>
              <div className="space-y-3">
                {lines.map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-12 gap-2 items-end rounded-xl border border-[#d8e3fb] p-3"
                  >
                    <label className="col-span-12 sm:col-span-5">
                      <span className="text-[10px] font-bold uppercase text-[#94A3B8]">
                        Xizmat nomi
                      </span>
                      <input
                        className="mt-1 w-full rounded-lg border border-[#d8e3fb] px-3 py-2 text-[12px] font-bold"
                        value={line.name}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.id === line.id ? { ...l, name: e.target.value } : l,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="col-span-4 sm:col-span-2">
                      <span className="text-[10px] font-bold uppercase text-[#94A3B8]">
                        Miqdor
                      </span>
                      <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-lg border border-[#d8e3fb] px-3 py-2 text-[12px] font-bold"
                        value={line.qty}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.id === line.id
                                ? { ...l, qty: Math.max(1, Number(e.target.value) || 1) }
                                : l,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="col-span-5 sm:col-span-3">
                      <span className="text-[10px] font-bold uppercase text-[#94A3B8]">
                        Narxi (UZS)
                      </span>
                      <input
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded-lg border border-[#d8e3fb] px-3 py-2 text-[12px] font-bold"
                        value={line.price}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.id === line.id
                                ? { ...l, price: Math.max(0, Number(e.target.value) || 0) }
                                : l,
                            ),
                          )
                        }
                      />
                    </label>
                    <div className="col-span-2 sm:col-span-1 flex flex-col items-end">
                      <span className="text-[10px] font-bold uppercase text-[#94A3B8]">
                        Jami
                      </span>
                      <span className="text-[11px] font-black text-[#006781] mt-2 tabular-nums">
                        {(line.qty * line.price / 1_000_000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="p-2 text-[#F43F5E] hover:bg-rose-50 rounded-lg"
                        aria-label="O‘chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Qo‘shimcha izohlar
                </span>
                <textarea
                  className="mt-1.5 w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-4 py-3 text-[13px] font-semibold min-h-[90px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="font-display text-[20px] font-bold text-[#0d2137]">
                To‘lov shartlari
              </h2>
              <textarea
                className="w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-4 py-3 text-[13px] font-semibold min-h-[140px]"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h2 className="font-display text-[20px] font-bold text-[#0d2137]">
                Ko‘rib chiqish
              </h2>
              <div className="rounded-xl border border-[#d8e3fb] p-4 space-y-2 text-[13px] font-semibold">
                <div className="flex justify-between gap-3">
                  <span className="text-[#64748B]">Mijoz</span>
                  <span className="font-bold text-[#0d2137] text-right">{clientName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#64748B]">Loyiha</span>
                  <span className="font-bold text-[#0d2137] text-right">{project}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#64748B]">Qatorlar</span>
                  <span className="font-bold text-[#0d2137]">{lines.length}</span>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[#d8e3fb]">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[#f0f3ff] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    <tr>
                      <th className="px-3 py-2">Xizmat</th>
                      <th className="px-3 py-2">Miqdor</th>
                      <th className="px-3 py-2 text-right">Jami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id} className="border-t border-[#d8e3fb]">
                        <td className="px-3 py-2.5 font-bold text-[#111c2d]">{l.name}</td>
                        <td className="px-3 py-2.5 font-semibold text-[#64748B]">{l.qty}</td>
                        <td className="px-3 py-2.5 font-bold text-right text-[#006781]">
                          {formatSom(l.qty * l.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[12px] font-semibold text-[#64748B]">{terms}</p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-[#d8e3fb] pt-5">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] text-[13px] font-bold disabled:opacity-40"
            >
              <ArrowLeft size={16} />
              Oldingi
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006781] text-white text-[13px] font-bold"
              >
                Keyingisi
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => void finish()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d2137] text-white text-[13px] font-bold disabled:opacity-50"
              >
                {saving ? "Saqlanmoqda…" : "Invoysni yuborish"}
              </button>
            )}
          </div>
        </div>

        <aside className="bg-white border border-[#d8e3fb] rounded-2xl p-5 h-fit sticky top-4">
          <h3 className="font-display text-[18px] font-bold text-[#0d2137]">Xulosa</h3>
          <div className="mt-4 rounded-xl bg-[#f0f3ff] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Mijoz
            </div>
            <div className="text-[14px] font-bold text-[#0d2137] mt-1">{clientName}</div>
            <div className="text-[12px] font-semibold text-[#64748B]">{clientCity}</div>
            <div className="text-[12px] font-semibold text-[#006781] mt-2">{project}</div>
          </div>
          <div className="mt-4 space-y-2 text-[13px] font-semibold">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Subtotal</span>
              <span>{formatSom(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Soliq (VAT {VAT_RATE}%)</span>
              <span>{formatSom(vat)}</span>
            </div>
            <div className="flex justify-between border-t border-[#d8e3fb] pt-2 text-[16px] font-black text-[#0d2137]">
              <span>Jami</span>
              <span>{formatSom(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
