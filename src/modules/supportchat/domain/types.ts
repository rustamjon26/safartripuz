export type SupportPartyType =
  | "hotel"
  | "homestay"
  | "taxi"
  | "guide"
  | "customer";

export type SupportThreadStatus = "OPEN" | "CLOSED";
export type SupportMemberRole = "AGENT" | "PARTY";

export type SupportThreadView = {
  id: string;
  subject: string;
  partyType: SupportPartyType;
  partyUserId: string;
  partyName: string;
  partyEmail: string | null;
  status: SupportThreadStatus;
  preview: string | null;
  lastMessageAt: string | null;
  unread: number;
  createdAt: string;
};

export type SupportMessageView = {
  id: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: string;
  me: boolean;
  role: SupportMemberRole | null;
};
