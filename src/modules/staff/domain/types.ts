export type StaffShiftStatus =
  | "SCHEDULED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type StaffOpsTaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type StaffOpsTaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type StaffChatThreadKind = "DEPARTMENT" | "DIRECT" | "ANNOUNCEMENT";

export type StaffContext = {
  userId: string;
  hotelId: string;
  staffId: string;
  department: string;
  displayName: string;
};

export type ShiftView = {
  id: string;
  title: string;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  status: StaffShiftStatus;
  notes: string | null;
};

export type TaskView = {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  priority: StaffOpsTaskPriority;
  status: StaffOpsTaskStatus;
  dueAt: Date | null;
  staffId: string | null;
  assigneeName: string | null;
  completedAt: Date | null;
  createdAt: Date;
};

export type ThreadView = {
  id: string;
  name: string;
  kind: StaffChatThreadKind;
  department: string | null;
  preview: string | null;
  lastMessageAt: Date | null;
  unread: number;
};

export type ChatMessageView = {
  id: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: Date;
  me: boolean;
};

export type CourseView = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  durationMin: number;
  moduleCount: number;
  progressPct: number;
  enrolled: boolean;
};

export type ModuleView = {
  id: string;
  sortOrder: number;
  title: string;
  body: string | null;
  videoUrl: string | null;
  completed: boolean;
};
