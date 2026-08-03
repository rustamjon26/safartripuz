import type { StaffShiftStatus } from "./types";

const TRANSITIONS: Record<StaffShiftStatus, StaffShiftStatus[]> = {
  SCHEDULED: ["ACTIVE", "CANCELLED", "NO_SHOW"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canShiftTransition(from: StaffShiftStatus, to: StaffShiftStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export class StaffShiftStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffShiftStatusError";
  }
}

export function assertShiftTransition(from: StaffShiftStatus, to: StaffShiftStatus): void {
  if (!canShiftTransition(from, to)) {
    throw new StaffShiftStatusError(`Illegal shift transition: ${from} → ${to}`);
  }
}
