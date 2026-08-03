import { DidoxClient, DocumentType, builders } from "didox";
import { requireEnv } from "@/src/shared/env";

function resolveDidoxEnvironment(): "production" | "development" {
  const env = process.env.DIDOX_ENVIRONMENT?.toLowerCase();
  if (env === "production") return "production";
  return "development";
}

function getDidoxClient(): DidoxClient {
  return new DidoxClient({
    partnerToken: requireEnv("DIDOX_PARTNER_TOKEN"),
    environment: resolveDidoxEnvironment(),
  });
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseContractDate(contractDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(contractDate)) return contractDate;
  const dotted = contractDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;
  return toIsoDate(new Date());
}

export type SendDidoxInvoiceParams = {
  contractNumber: string;
  contractDate: string;
  sellerTin: string;
  sellerName: string;
  sellerAddress: string;
  sellerBankAccount: string;
  sellerBankId: string;
  buyerTin: string;
  buyerName: string;
  productName: string;
  amount: number;
  catalogCode: string;
};

export async function sendDidoxInvoice(params: SendDidoxInvoiceParams) {
  if (!process.env.DIDOX_PARTNER_TOKEN || !process.env.DIDOX_TAX_ID || !process.env.DIDOX_PASSWORD) {
    throw new Error("Didox credentials are not configured");
  }

  const didox = getDidoxClient();

  await didox.auth.loginLegalEntity({
    taxId: process.env.DIDOX_TAX_ID,
    password: process.env.DIDOX_PASSWORD,
    locale: "uz",
  });

  const facturaDate = params.contractDate ? parseContractDate(params.contractDate) : toIsoDate(new Date());

  const invoicePayload = builders
    .invoice()
    .raw({
      factura: {
        no: params.contractNumber,
        date: facturaDate,
      },
      contract: {
        no: params.contractNumber,
        date: facturaDate,
      },
      seller: {
        tin: params.sellerTin,
        name: params.sellerName,
        vatRegCode: "",
        account: params.sellerBankAccount,
        bankId: params.sellerBankId,
        address: params.sellerAddress,
      },
      buyer: {
        tin: params.buyerTin,
        name: params.buyerName,
        vatRegCode: "",
        account: "",
        bankId: "",
        address: "",
      },
      products: [
        {
          catalogCode: params.catalogCode,
          name: params.productName,
          packageCode: "1",
          packageName: "dona",
          quantity: 1,
          price: params.amount,
          vatRate: 12,
          origin: 1,
        },
      ],
    })
    .build();

  const draft = await didox.documents.createDraft(DocumentType.FACTURA, invoicePayload);
  console.log("[Didox] Draft created:", draft);

  return draft;
}

export function extractDidoxDocumentId(draft: unknown): string | null {
  if (!draft || typeof draft !== "object") return null;
  const record = draft as Record<string, unknown>;
  const candidates = [record.documentId, record.id, record.document_id];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value;
  }
  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (typeof data.id === "string" && data.id.trim()) return data.id;
    if (typeof data.documentId === "string" && data.documentId.trim()) return data.documentId;
  }
  return null;
}
