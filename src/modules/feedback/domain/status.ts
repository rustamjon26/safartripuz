import type { FeedbackTicketStatus } from "./types";

const TRANSITIONS: Record<FeedbackTicketStatus, FeedbackTicketStatus[]> = {
  OPEN: ["ANSWERED", "ESCALATED", "CLOSED"],
  ANSWERED: ["CLOSED", "ESCALATED"],
  ESCALATED: ["ANSWERED", "CLOSED", "OPEN"],
  CLOSED: ["OPEN"],
};

export function canTransition(
  from: FeedbackTicketStatus,
  to: FeedbackTicketStatus,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: FeedbackTicketStatus,
  to: FeedbackTicketStatus,
): void {
  if (!canTransition(from, to)) {
    throw new FeedbackStatusError(
      `Illegal feedback status transition: ${from} → ${to}`,
    );
  }
}

/** First support reply always moves OPEN/ESCALATED → ANSWERED. */
export function statusAfterReply(
  current: FeedbackTicketStatus,
): FeedbackTicketStatus {
  if (current === "CLOSED") {
    throw new FeedbackStatusError("CLOSED ticketga javob yozib bo‘lmaydi");
  }
  return "ANSWERED";
}

export class FeedbackStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackStatusError";
  }
}
