export type FeedbackChannel = "hotel" | "guide" | "taxi" | "homestay" | "direct";

export type FeedbackTicketStatus = "OPEN" | "ANSWERED" | "ESCALATED" | "CLOSED";

export type FeedbackSentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export type FeedbackSourceType =
  | "GuideReview"
  | "TaxiReview"
  | "HomeStayReview"
  | "GuestFeedback"
  | "Direct";

export type IngestFeedbackInput = {
  channel: FeedbackChannel;
  sourceType: FeedbackSourceType;
  sourceId: string;
  authorUserId?: string | null;
  authorName: string;
  rating: number;
  body: string;
  serviceLabel?: string | null;
  subjectId?: string | null;
  category?: string | null;
  /** Preserve original review timestamp when backfilling. */
  createdAt?: Date;
};

export type FeedbackReplyView = {
  id: string;
  body: string;
  authorUserId: string;
  createdAt: Date;
};

export type FeedbackTicketView = {
  id: string;
  channel: FeedbackChannel;
  sourceType: string;
  sourceId: string;
  authorUserId: string | null;
  authorName: string;
  rating: number;
  body: string;
  serviceLabel: string | null;
  subjectId: string | null;
  status: FeedbackTicketStatus;
  sentiment: FeedbackSentiment;
  category: string | null;
  assignedToId: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  replies: FeedbackReplyView[];
};

export type ListFeedbackFilter = {
  status?: FeedbackTicketStatus | "all";
  channel?: FeedbackChannel | "all";
  rating?: "all" | "5" | "4" | "low";
  q?: string;
  page?: number;
  pageSize?: number;
};

export type FeedbackOverview = {
  total: number;
  open: number;
  answered: number;
  avgRating: number;
  responseRate: number;
  sentimentIndex: number;
  bySentiment: { positive: number; neutral: number; negative: number };
};
