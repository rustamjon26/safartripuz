export type HotelInvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "SENT"
  | "PAID"
  | "VOID";

export type InvoiceLineInput = {
  name: string;
  description?: string;
  quantity: number;
  /** Unit price in som (major units) — converted to tiyin at boundary. */
  unitPriceSom: number;
};

export type InvoiceLineView = {
  id: string;
  sortOrder: number;
  name: string;
  description: string | null;
  quantity: number;
  unitPriceTiyin: string;
  lineTotalTiyin: string;
  unitPriceSom: number;
  lineTotalSom: number;
};

export type InvoiceView = {
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
  subtotalTiyin: string;
  vatTiyin: string;
  totalTiyin: string;
  subtotalSom: number;
  vatSom: number;
  totalSom: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  didoxDocumentId: string | null;
  createdAt: string;
  lines: InvoiceLineView[];
};

export type CreateInvoiceInput = {
  hotelId: string;
  createdByUserId?: string;
  bookingId?: string;
  clientName: string;
  clientAddress?: string;
  clientCity?: string;
  clientCountry?: string;
  clientTin?: string;
  project?: string;
  terms?: string;
  notes?: string;
  vatRateBps?: number;
  dueAt?: Date;
  lines: InvoiceLineInput[];
  /** If true, create as ISSUED immediately. */
  issue?: boolean;
};
