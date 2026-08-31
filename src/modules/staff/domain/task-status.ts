import type { StaffOpsTaskStatus } from "./types";

const TRANSITIONS: Record<StaffOpsTaskStatus, StaffOpsTaskStatus[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED", "DONE"],
  IN_PROGRESS: ["DONE", "CANCELLED", "PENDING"],
  DONE: [],
  CANCELLED: ["PENDING"],
};

export function canTaskTransition(from: StaffOpsTaskStatus, to: StaffOpsTaskStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export class StaffTaskStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffTaskStatusError";
  }
}

export function assertTaskTransition(from: StaffOpsTaskStatus, to: StaffOpsTaskStatus): void {
  if (!canTaskTransition(from, to)) {
    throw new StaffTaskStatusError(`Illegal task transition: ${from} → ${to}`);
  }
}
